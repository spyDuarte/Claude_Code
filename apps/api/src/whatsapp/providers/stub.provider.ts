import { Injectable, Logger } from '@nestjs/common';
import type {
  IWhatsAppProvider,
  WhatsAppGroup,
  WhatsAppSessionInfo,
  SendMessageResult,
  NormalizedInboundMessage,
} from '../interfaces/whatsapp-provider.interface';

/**
 * Stub WhatsApp provider for development and testing.
 * Simulates a realistic session lifecycle and message flow
 * without requiring a real WhatsApp connection.
 *
 * To integrate a real provider (e.g., WAPI, Baileys, Z-API):
 * 1. Implement IWhatsAppProvider
 * 2. Register the new provider in whatsapp.module.ts
 * 3. Point WHATSAPP_PROVIDER env var to the new provider token
 */
@Injectable()
export class StubWhatsAppProvider implements IWhatsAppProvider {
  private readonly logger = new Logger(StubWhatsAppProvider.name);

  // In-memory session store (would be external in a real provider)
  private sessions = new Map<
    string,
    { status: WhatsAppSessionInfo['status']; qrCode?: string; connectedAt?: Date }
  >();

  async createSession(userId: string): Promise<WhatsAppSessionInfo> {
    const sessionRef = `stub-${userId}-${Date.now()}`;

    // Simulate QR code generation phase
    this.sessions.set(sessionRef, {
      status: 'QR_CODE',
      qrCode: this.generateFakeQrCode(sessionRef),
    });

    this.logger.log(`Stub session created: ${sessionRef} (QR phase)`);

    // Auto-connect after simulated scan (would be webhook-driven in real impl)
    setTimeout(() => {
      const session = this.sessions.get(sessionRef);
      if (session) {
        session.status = 'CONNECTED';
        session.connectedAt = new Date();
        delete session.qrCode;
        this.logger.log(`Stub session auto-connected: ${sessionRef}`);
      }
    }, 5000);

    return {
      sessionRef,
      status: 'QR_CODE',
      qrCode: this.sessions.get(sessionRef)?.qrCode,
    };
  }

  async getSessionStatus(sessionRef: string): Promise<WhatsAppSessionInfo> {
    const session = this.sessions.get(sessionRef);

    if (!session) {
      return { sessionRef, status: 'DISCONNECTED' };
    }

    return {
      sessionRef,
      status: session.status,
      qrCode: session.qrCode,
    };
  }

  async disconnectSession(sessionRef: string): Promise<void> {
    const session = this.sessions.get(sessionRef);
    if (session) {
      session.status = 'DISCONNECTED';
      delete session.qrCode;
    }
    this.logger.log(`Stub session disconnected: ${sessionRef}`);
  }

  async listGroups(sessionRef: string): Promise<WhatsAppGroup[]> {
    const session = this.sessions.get(sessionRef);

    // Return stub groups if connected (or ref matches known stub refs)
    if (!session || session.status !== 'CONNECTED') {
      // Allow known seeded sessions to work
      if (!sessionRef.startsWith('stub-')) {
        return [];
      }
    }

    return [
      {
        externalGroupId: 'stub-group-001@g.us',
        name: 'Plantões SP Capital',
        participantCount: 247,
      },
      {
        externalGroupId: 'stub-group-002@g.us',
        name: 'Vagas Médicas - Grande SP',
        participantCount: 183,
      },
      {
        externalGroupId: 'stub-group-003@g.us',
        name: 'UPA e Hospital Regional',
        participantCount: 412,
      },
      {
        externalGroupId: 'stub-group-004@g.us',
        name: 'Plantões Interior SP',
        participantCount: 98,
      },
      {
        externalGroupId: 'stub-group-005@g.us',
        name: 'Escalas Médicas RJ',
        participantCount: 156,
      },
    ];
  }

  async sendMessage(
    sessionRef: string,
    destination: string,
    message: string,
  ): Promise<SendMessageResult> {
    this.logger.log(`Stub send to ${destination}: "${message.substring(0, 50)}..."`);

    // Simulate occasional failure
    if (Math.random() < 0.05) {
      return { success: false, error: 'Stub: simulated send failure' };
    }

    return {
      success: true,
      messageId: `stub-out-${Date.now()}`,
    };
  }

  async handleWebhook(payload: unknown): Promise<NormalizedInboundMessage | null> {
    if (!payload || typeof payload !== 'object') {
      return null;
    }

    const p = payload as Record<string, unknown>;

    // Handle direct stub-format webhook
    if (p['type'] === 'message' && p['messageText']) {
      return {
        externalMessageId: (p['messageId'] as string) ?? `stub-${Date.now()}`,
        externalGroupId: (p['groupId'] as string) ?? 'stub-group-001@g.us',
        senderName: (p['senderName'] as string) ?? 'Unknown',
        senderNumber: (p['senderNumber'] as string) ?? '5511999990000',
        messageText: p['messageText'] as string,
        receivedAt: new Date(),
        rawPayload: p,
      };
    }

    // Handle WAPI/common provider format
    if (p['event'] === 'message' && p['data']) {
      const data = p['data'] as Record<string, unknown>;
      const content = data['message'] as Record<string, unknown> | undefined;
      if (content?.['body']) {
        return {
          externalMessageId: (data['id'] as string) ?? `stub-${Date.now()}`,
          externalGroupId: (data['chatId'] as string) ?? 'unknown@g.us',
          senderName: (data['senderName'] as string) ?? 'Unknown',
          senderNumber: (data['sender'] as string) ?? '0000',
          messageText: content['body'] as string,
          receivedAt: new Date(),
          rawPayload: p,
        };
      }
    }

    return null;
  }

  private generateFakeQrCode(sessionRef: string): string {
    // In a real provider this would be an actual QR code data URL
    return `data:image/svg+xml;base64,${Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="white"/><text x="10" y="100" font-size="12">STUB QR: ${sessionRef.slice(0, 20)}</text></svg>`,
    ).toString('base64')}`;
  }
}
