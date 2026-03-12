export interface WhatsAppGroup {
  externalGroupId: string;
  name: string;
  participantCount?: number;
}

export interface WhatsAppSessionInfo {
  sessionRef: string;
  status: 'PENDING' | 'QR_CODE' | 'CONNECTED' | 'DISCONNECTED' | 'FAILED';
  qrCode?: string;
}

export interface SendMessageResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface IWhatsAppProvider {
  /**
   * Initialize or re-initialize a session for the given user.
   * Returns session info including QR code if authentication is needed.
   */
  createSession(userId: string): Promise<WhatsAppSessionInfo>;

  /**
   * Get current status of a session.
   */
  getSessionStatus(sessionRef: string): Promise<WhatsAppSessionInfo>;

  /**
   * Disconnect and clean up a session.
   */
  disconnectSession(sessionRef: string): Promise<void>;

  /**
   * List all groups the session is part of.
   */
  listGroups(sessionRef: string): Promise<WhatsAppGroup[]>;

  /**
   * Send a text message to a destination (group or contact JID).
   */
  sendMessage(sessionRef: string, destination: string, message: string): Promise<SendMessageResult>;

  /**
   * Process an incoming webhook payload from the provider.
   * Returns a normalized message if payload is a text message, null otherwise.
   */
  handleWebhook(payload: unknown): Promise<NormalizedInboundMessage | null>;
}

export interface NormalizedInboundMessage {
  externalMessageId: string;
  externalGroupId: string;
  senderName: string;
  senderNumber: string;
  messageText: string;
  receivedAt: Date;
  rawPayload: Record<string, unknown>;
}
