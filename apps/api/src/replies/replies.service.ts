import { Injectable, Logger, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { DeduplicationService } from './deduplication.service';
import {
  AuditEventType,
  AutoReplyMode,
  MatchDecision,
  OutgoingMessageStatus,
} from '@plantao-radar/shared';
import type { ClassifierResponse } from '@plantao-radar/shared';
import type { UserFilter } from '@prisma/client';

@Injectable()
export class RepliesService {
  private readonly logger = new Logger(RepliesService.name);

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    @Inject(forwardRef(() => WhatsAppService))
    private whatsappService: WhatsAppService,
    private deduplicationService: DeduplicationService,
  ) {}

  /**
   * Decide what to do with a classifier result and act accordingly.
   */
  async processDecision(
    userId: string,
    incomingMessageId: string,
    groupId: string,
    messageHash: string,
    senderNumber: string,
    classifierResult: ClassifierResponse,
    filter: UserFilter,
    matchDecision: MatchDecision,
  ): Promise<{ action: string; outgoingMessageId?: string }> {
    // Check duplicate before doing anything
    const isDuplicate = await this.deduplicationService.isDuplicate(
      userId,
      groupId,
      messageHash,
    );

    if (isDuplicate) {
      this.logger.log(`Duplicate message detected for user ${userId}, group ${groupId}`);
      await this.auditService.log(userId, AuditEventType.MESSAGE_REJECTED_DUPLICATE, 'IncomingMessage', incomingMessageId, {
        messageHash,
      });
      return { action: 'duplicate_rejected' };
    }

    if (matchDecision === MatchDecision.REJECTED) {
      return { action: 'rejected' };
    }

    if (matchDecision === MatchDecision.AUTO_SEND) {
      return this.autoSend(userId, incomingMessageId, senderNumber, classifierResult, filter);
    }

    if (matchDecision === MatchDecision.REVIEW) {
      return this.queueForReview(userId, incomingMessageId, senderNumber, classifierResult, filter);
    }

    return { action: 'no_action' };
  }

  private async autoSend(
    userId: string,
    incomingMessageId: string,
    senderNumber: string,
    classifierResult: ClassifierResponse,
    filter: UserFilter,
  ): Promise<{ action: string; outgoingMessageId?: string }> {
    const messageText = this.renderTemplate(
      filter.replyTemplate,
      classifierResult.suggestedReply,
    );

    const outgoing = await this.prisma.outgoingMessage.create({
      data: {
        userId,
        incomingMessageId,
        destinationRef: senderNumber,
        messageText,
        sendMode: AutoReplyMode.FULL_AUTO,
        status: OutgoingMessageStatus.PENDING,
      },
    });

    try {
      const result = await this.whatsappService.sendMessage(userId, senderNumber, messageText);

      await this.prisma.outgoingMessage.update({
        where: { id: outgoing.id },
        data: {
          status: result.success ? OutgoingMessageStatus.SENT : OutgoingMessageStatus.FAILED,
          providerResponse: result as unknown as Record<string, unknown>,
          sentAt: result.success ? new Date() : null,
        },
      });

      await this.auditService.log(userId, AuditEventType.REPLY_AUTO_SENT, 'OutgoingMessage', outgoing.id, {
        destination: senderNumber,
        success: result.success,
      });

      return { action: 'auto_sent', outgoingMessageId: outgoing.id };
    } catch (err) {
      await this.prisma.outgoingMessage.update({
        where: { id: outgoing.id },
        data: { status: OutgoingMessageStatus.FAILED },
      });
      this.logger.error('Auto-send failed', err);
      return { action: 'auto_send_failed', outgoingMessageId: outgoing.id };
    }
  }

  private async queueForReview(
    userId: string,
    incomingMessageId: string,
    senderNumber: string,
    classifierResult: ClassifierResponse,
    filter: UserFilter,
  ): Promise<{ action: string; outgoingMessageId?: string }> {
    const messageText = this.renderTemplate(
      filter.replyTemplate,
      classifierResult.suggestedReply,
    );

    const outgoing = await this.prisma.outgoingMessage.create({
      data: {
        userId,
        incomingMessageId,
        destinationRef: senderNumber,
        messageText,
        sendMode: AutoReplyMode.SEMI_AUTO,
        status: OutgoingMessageStatus.PENDING,
      },
    });

    await this.auditService.log(userId, AuditEventType.REPLY_QUEUED_REVIEW, 'OutgoingMessage', outgoing.id, {
      destination: senderNumber,
    });

    return { action: 'queued_review', outgoingMessageId: outgoing.id };
  }

  async approveReply(userId: string, incomingMessageId: string): Promise<void> {
    const outgoing = await this.prisma.outgoingMessage.findFirst({
      where: { incomingMessageId, userId, status: OutgoingMessageStatus.PENDING },
    });

    if (!outgoing) {
      throw new NotFoundException('No pending reply found for this opportunity');
    }

    try {
      const result = await this.whatsappService.sendMessage(
        userId,
        outgoing.destinationRef,
        outgoing.messageText,
      );

      await this.prisma.outgoingMessage.update({
        where: { id: outgoing.id },
        data: {
          status: result.success ? OutgoingMessageStatus.SENT : OutgoingMessageStatus.FAILED,
          providerResponse: result as unknown as Record<string, unknown>,
          sentAt: result.success ? new Date() : null,
        },
      });

      await this.auditService.log(userId, AuditEventType.REPLY_APPROVED, 'OutgoingMessage', outgoing.id, {});
    } catch (err) {
      throw new BadRequestException('Failed to send reply: ' + String(err));
    }
  }

  async rejectReply(userId: string, incomingMessageId: string): Promise<void> {
    const outgoing = await this.prisma.outgoingMessage.findFirst({
      where: { incomingMessageId, userId },
    });

    if (!outgoing) {
      throw new NotFoundException('No reply found for this opportunity');
    }

    await this.prisma.outgoingMessage.update({
      where: { id: outgoing.id },
      data: { status: OutgoingMessageStatus.CANCELLED },
    });

    await this.auditService.log(userId, AuditEventType.REPLY_REJECTED, 'OutgoingMessage', outgoing.id, {});
  }

  private renderTemplate(template: string | null, suggestedReply: string | null | undefined): string {
    if (template) return template;
    if (suggestedReply) return suggestedReply;
    return 'Olá! Tenho interesse no plantão. Pode me passar mais detalhes?';
  }
}
