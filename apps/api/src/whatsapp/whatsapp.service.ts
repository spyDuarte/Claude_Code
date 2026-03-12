import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuditEventType, WhatsAppSessionStatus } from '@plantao-radar/shared';
import type { IWhatsAppProvider, NormalizedInboundMessage } from './interfaces/whatsapp-provider.interface';
import { WHATSAPP_PROVIDER } from './whatsapp.constants';

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    @Inject(WHATSAPP_PROVIDER) private provider: IWhatsAppProvider,
  ) {}

  async createSession(userId: string) {
    // Disconnect existing session if any
    const existing = await this.prisma.whatsAppSession.findFirst({
      where: {
        userId,
        status: { not: WhatsAppSessionStatus.DISCONNECTED },
      },
    });

    if (existing) {
      await this.provider.disconnectSession(existing.sessionRef ?? '');
      await this.prisma.whatsAppSession.update({
        where: { id: existing.id },
        data: { status: WhatsAppSessionStatus.DISCONNECTED },
      });
    }

    const sessionInfo = await this.provider.createSession(userId);

    const session = await this.prisma.whatsAppSession.create({
      data: {
        userId,
        provider: 'stub',
        status: WhatsAppSessionStatus.QR_CODE,
        sessionRef: sessionInfo.sessionRef,
        lastSeenAt: new Date(),
      },
    });

    await this.auditService.log(userId, AuditEventType.SESSION_CREATED, 'WhatsAppSession', session.id, {
      sessionRef: sessionInfo.sessionRef,
    });

    return {
      ...this.toDto(session),
      qrCode: sessionInfo.qrCode,
    };
  }

  async getSession(userId: string) {
    const session = await this.prisma.whatsAppSession.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    if (!session) {
      return null;
    }

    // Refresh status from provider
    if (session.sessionRef) {
      try {
        const info = await this.provider.getSessionStatus(session.sessionRef);
        const newStatus = info.status as WhatsAppSessionStatus;

        if (newStatus !== session.status) {
          await this.prisma.whatsAppSession.update({
            where: { id: session.id },
            data: { status: newStatus, lastSeenAt: new Date() },
          });
          session.status = newStatus;

          if (newStatus === WhatsAppSessionStatus.CONNECTED) {
            await this.auditService.log(userId, AuditEventType.SESSION_CONNECTED, 'WhatsAppSession', session.id, {});
          }
        }
      } catch {
        // Provider unreachable — return cached status
      }
    }

    return this.toDto(session);
  }

  async disconnectSession(userId: string) {
    const session = await this.prisma.whatsAppSession.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    if (!session) {
      throw new NotFoundException('No active session found');
    }

    if (session.sessionRef) {
      await this.provider.disconnectSession(session.sessionRef);
    }

    await this.prisma.whatsAppSession.update({
      where: { id: session.id },
      data: { status: WhatsAppSessionStatus.DISCONNECTED },
    });

    await this.auditService.log(userId, AuditEventType.SESSION_DISCONNECTED, 'WhatsAppSession', session.id, {});

    return { message: 'Session disconnected' };
  }

  async syncGroups(userId: string) {
    const session = await this.prisma.whatsAppSession.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    if (!session) {
      throw new NotFoundException('No session found. Please connect WhatsApp first.');
    }

    if (!session.sessionRef) {
      throw new BadRequestException('Session has no reference. Please reconnect.');
    }

    const groups = await this.provider.listGroups(session.sessionRef);

    const upserted = await Promise.all(
      groups.map((g) =>
        this.prisma.group.upsert({
          where: {
            sessionId_externalGroupId: {
              sessionId: session.id,
              externalGroupId: g.externalGroupId,
            },
          },
          update: {
            groupName: g.name,
            isActive: true,
            lastSyncAt: new Date(),
          },
          create: {
            sessionId: session.id,
            externalGroupId: g.externalGroupId,
            groupName: g.name,
            isActive: true,
            lastSyncAt: new Date(),
          },
        }),
      ),
    );

    await this.auditService.log(userId, AuditEventType.GROUPS_SYNCED, 'WhatsAppSession', session.id, {
      groupCount: upserted.length,
    });

    return { synced: upserted.length, groups: upserted };
  }

  async handleWebhook(userId: string, rawPayload: unknown): Promise<NormalizedInboundMessage | null> {
    return this.provider.handleWebhook(rawPayload);
  }

  async sendMessage(userId: string, destination: string, messageText: string) {
    const session = await this.prisma.whatsAppSession.findFirst({
      where: { userId, status: WhatsAppSessionStatus.CONNECTED },
      orderBy: { createdAt: 'desc' },
    });

    if (!session?.sessionRef) {
      throw new BadRequestException('No connected session found');
    }

    return this.provider.sendMessage(session.sessionRef, destination, messageText);
  }

  private toDto(session: {
    id: string;
    userId: string;
    provider: string;
    status: WhatsAppSessionStatus;
    sessionRef: string | null;
    lastSeenAt: Date | null;
    createdAt: Date;
  }) {
    return {
      id: session.id,
      userId: session.userId,
      provider: session.provider,
      status: session.status,
      sessionRef: session.sessionRef,
      lastSeenAt: session.lastSeenAt?.toISOString() ?? null,
      createdAt: session.createdAt.toISOString(),
    };
  }
}
