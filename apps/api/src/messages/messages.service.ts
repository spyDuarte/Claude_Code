import { Injectable, Logger, NotFoundException, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { FiltersService } from '../filters/filters.service';
import { RepliesService } from '../replies/replies.service';
import { CLASSIFIER_SERVICE, IClassifierService } from '../classifier/interfaces/classifier.interface';
import { runHeuristics, computeDeterministicPenalties } from './heuristics';
import { parseMessage } from './parser';
import { hashText } from './normalizer';
import {
  AuditEventType,
  MatchDecision,
} from '@plantao-radar/shared';
import type { NormalizedInboundMessage } from '../whatsapp/interfaces/whatsapp-provider.interface';

@Injectable()
export class MessagesService {
  private readonly logger = new Logger(MessagesService.name);

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private filtersService: FiltersService,
    private repliesService: RepliesService,
    @Inject(CLASSIFIER_SERVICE) private classifier: IClassifierService,
  ) {}

  /**
   * Entry point for webhook-delivered messages.
   * Finds the session/group context, then processes the message.
   */
  async processWebhook(rawPayload: unknown): Promise<void> {
    // The webhook payload needs to be matched to a session + user
    // In a real provider, the payload includes the sessionRef or account identifier
    const payload = rawPayload as Record<string, unknown>;
    const sessionRef = payload['sessionRef'] as string | undefined;

    if (!sessionRef) {
      this.logger.warn('Webhook payload missing sessionRef');
      return;
    }

    const session = await this.prisma.whatsAppSession.findFirst({
      where: { sessionRef },
    });

    if (!session) {
      this.logger.warn(`No session found for ref: ${sessionRef}`);
      return;
    }

    // Normalize using provider's webhook handler would happen in the controller
    // Here we accept a pre-normalized message for direct processing
    if (payload['type'] === 'message' || payload['event'] === 'message') {
      const normalized: NormalizedInboundMessage = {
        externalMessageId: (payload['externalMessageId'] ?? payload['messageId'] ?? `gen-${Date.now()}`) as string,
        externalGroupId: (payload['externalGroupId'] ?? payload['groupId'] ?? '') as string,
        senderName: (payload['senderName'] ?? 'Unknown') as string,
        senderNumber: (payload['senderNumber'] ?? payload['sender'] ?? '') as string,
        messageText: (payload['messageText'] ?? payload['text'] ?? '') as string,
        receivedAt: new Date(),
        rawPayload: payload,
      };

      await this.processNormalizedMessage(session.userId, session.id, normalized);
    }
  }

  /**
   * Process a pre-normalized inbound message through the full pipeline.
   */
  async processNormalizedMessage(
    userId: string,
    sessionId: string,
    message: NormalizedInboundMessage,
  ): Promise<void> {
    // 1. Find the group
    const group = await this.prisma.group.findFirst({
      where: { sessionId, externalGroupId: message.externalGroupId },
    });

    if (!group) {
      this.logger.debug(`Group not found: ${message.externalGroupId}`);
      return;
    }

    // 2. Check if group is monitored
    const monitoredGroup = await this.prisma.monitoredGroup.findUnique({
      where: { userId_groupId: { userId, groupId: group.id } },
    });

    if (!monitoredGroup?.monitoringEnabled) {
      this.logger.debug(`Group ${group.id} not monitored for user ${userId}`);
      return;
    }

    // 3. Persist raw incoming message (check duplicate by externalMessageId first)
    const existing = await this.prisma.incomingMessage.findFirst({
      where: { sessionId, externalMessageId: message.externalMessageId },
    });

    if (existing) {
      this.logger.debug(`Message ${message.externalMessageId} already processed`);
      return;
    }

    const incoming = await this.prisma.incomingMessage.create({
      data: {
        userId,
        sessionId,
        groupId: group.id,
        externalMessageId: message.externalMessageId,
        senderName: message.senderName,
        senderNumber: message.senderNumber,
        messageText: message.messageText,
        rawPayload: message.rawPayload,
        receivedAt: message.receivedAt,
      },
    });

    await this.auditService.log(userId, AuditEventType.MESSAGE_RECEIVED, 'IncomingMessage', incoming.id, {
      groupId: group.id,
      senderNumber: message.senderNumber,
    });

    // 4. Get user filter
    const filter = await this.filtersService.getFilter(userId);
    if (!filter) {
      this.logger.debug(`No filter for user ${userId}`);
      return;
    }

    // 5. Run heuristics
    const heuristic = runHeuristics(message.messageText, filter.blockedKeywords);

    if (!heuristic.possibleShiftOffer) {
      await this.auditService.log(userId, AuditEventType.MESSAGE_REJECTED_HEURISTIC, 'IncomingMessage', incoming.id, {
        reason: heuristic.rejectionReason,
      });

      // Still save parsed result as non-opportunity
      await this.persistParsedAndMatch(incoming.id, userId, heuristic, filter, {
        score: 0,
        decision: MatchDecision.REJECTED,
        rationale: heuristic.rejectionReason ?? 'Not a shift opportunity',
        matchedFields: [],
      });

      return;
    }

    // 6. Parse structured fields
    const parsed = parseMessage(message.messageText, heuristic, filter.hospitals);

    await this.prisma.parsedMessage.create({
      data: {
        incomingMessageId: incoming.id,
        possibleShiftOffer: parsed.possibleShiftOffer,
        extractedCity: parsed.extractedCity ?? null,
        extractedHospital: parsed.extractedHospital ?? null,
        extractedDate: parsed.extractedDate ?? null,
        extractedShift: parsed.extractedShift ?? null,
        extractedValue: parsed.extractedValue ?? null,
        extractedSpecialty: parsed.extractedSpecialty ?? null,
        extractedKeywords: parsed.extractedKeywords,
        parserVersion: parsed.parserVersion,
      },
    });

    // 7. Apply deterministic penalties
    const { penalty } = computeDeterministicPenalties(heuristic, {
      minValue: filter.minValue,
      cities: filter.cities,
      blockedKeywords: filter.blockedKeywords,
    });

    // 8. Call AI classifier
    await this.auditService.log(userId, AuditEventType.CLASSIFIER_CALLED, 'IncomingMessage', incoming.id, {});

    let classifierResult;
    try {
      classifierResult = await this.classifier.classify({
        messageText: message.messageText,
        normalizedText: heuristic.normalizedText,
        userFilter: {
          specialty: filter.specialty,
          cities: filter.cities,
          hospitals: filter.hospitals,
          minValue: filter.minValue ?? undefined,
          maxDistanceKm: filter.maxDistanceKm ?? undefined,
          acceptedShifts: filter.acceptedShifts as any[],
          requiredKeywords: filter.requiredKeywords,
          blockedKeywords: filter.blockedKeywords,
          autoReplyMode: filter.autoReplyMode as any,
          autoReplyThreshold: filter.autoReplyThreshold,
          semiAutoThreshold: filter.semiAutoThreshold,
          replyTemplate: filter.replyTemplate ?? undefined,
        },
        parsedContext: parsed,
      });
    } catch (err) {
      this.logger.error('Classifier threw unexpectedly', err);
      await this.auditService.log(userId, AuditEventType.CLASSIFIER_FALLBACK, 'IncomingMessage', incoming.id, {
        error: String(err),
      });
      return;
    }

    // 9. Apply penalty to score
    const finalScore = Math.max(0, Math.min(1, classifierResult.score - penalty));

    // 10. Determine decision
    const decision = this.computeDecision(finalScore, filter.autoReplyThreshold, filter.semiAutoThreshold);

    // 11. Persist match result
    await this.prisma.matchResult.create({
      data: {
        incomingMessageId: incoming.id,
        userId,
        score: finalScore,
        decision,
        rationale: classifierResult.shortReason,
        matchedFields: [],
        classifierVersion: '1.0.0',
        processedAt: new Date(),
      },
    });

    await this.auditService.log(userId, AuditEventType.MESSAGE_PROCESSED, 'IncomingMessage', incoming.id, {
      score: finalScore,
      decision,
    });

    // 12. Handle reply
    await this.repliesService.processDecision(
      userId,
      incoming.id,
      group.id,
      hashText(heuristic.normalizedText),
      message.senderNumber,
      classifierResult,
      filter,
      decision,
    );
  }

  private computeDecision(score: number, autoThreshold: number, semiThreshold: number): MatchDecision {
    if (score >= autoThreshold) return MatchDecision.AUTO_SEND;
    if (score >= semiThreshold) return MatchDecision.REVIEW;
    return MatchDecision.REJECTED;
  }

  private async persistParsedAndMatch(
    incomingMessageId: string,
    userId: string,
    heuristic: { possibleShiftOffer: boolean },
    filter: { autoReplyThreshold: number; semiAutoThreshold: number },
    match: { score: number; decision: MatchDecision; rationale: string; matchedFields: string[] },
  ) {
    await this.prisma.parsedMessage.create({
      data: {
        incomingMessageId,
        possibleShiftOffer: heuristic.possibleShiftOffer,
        extractedKeywords: [],
      },
    });

    await this.prisma.matchResult.create({
      data: {
        incomingMessageId,
        userId,
        score: match.score,
        decision: match.decision,
        rationale: match.rationale,
        matchedFields: match.matchedFields,
        classifierVersion: '1.0.0',
        processedAt: new Date(),
      },
    });
  }

  async listMessages(userId: string, options: { page?: number; limit?: number } = {}) {
    const page = options.page ?? 1;
    const limit = options.limit ?? 20;
    const skip = (page - 1) * limit;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.incomingMessage.findMany({
        where: { userId },
        include: {
          group: { select: { groupName: true } },
          parsedMessage: true,
          matchResult: true,
        },
        orderBy: { receivedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.incomingMessage.count({ where: { userId } }),
    ]);

    return { data, total, page, limit };
  }

  async listOpportunities(userId: string, options: { page?: number; limit?: number } = {}) {
    const page = options.page ?? 1;
    const limit = options.limit ?? 20;
    const skip = (page - 1) * limit;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.incomingMessage.findMany({
        where: {
          userId,
          matchResult: {
            decision: { in: [MatchDecision.AUTO_SEND, MatchDecision.REVIEW] },
          },
        },
        include: {
          group: { select: { groupName: true } },
          parsedMessage: true,
          matchResult: true,
          outgoingMessage: true,
        },
        orderBy: [{ matchResult: { score: 'desc' } }, { receivedAt: 'desc' }],
        skip,
        take: limit,
      }),
      this.prisma.incomingMessage.count({
        where: {
          userId,
          matchResult: {
            decision: { in: [MatchDecision.AUTO_SEND, MatchDecision.REVIEW] },
          },
        },
      }),
    ]);

    return { data, total, page, limit };
  }

  async getOpportunity(userId: string, incomingMessageId: string) {
    const message = await this.prisma.incomingMessage.findFirst({
      where: { id: incomingMessageId, userId },
      include: {
        group: { select: { groupName: true } },
        parsedMessage: true,
        matchResult: true,
        outgoingMessage: true,
      },
    });

    if (!message) throw new NotFoundException('Opportunity not found');
    return message;
  }
}
