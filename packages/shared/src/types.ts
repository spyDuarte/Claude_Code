import type {
  AutoReplyMode,
  MatchDecision,
  OutgoingMessageStatus,
  ShiftType,
  WhatsAppSessionStatus,
} from './enums';
import type { ClassifierResponse, ParsedMessage, UserFilter } from './schemas';

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface RegisterDto {
  name: string;
  email: string;
  password: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  user: UserDto;
}

export interface UserDto {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

// ─── WhatsApp ─────────────────────────────────────────────────────────────────

export interface WhatsAppSessionDto {
  id: string;
  userId: string;
  provider: string;
  status: WhatsAppSessionStatus;
  sessionRef: string | null;
  lastSeenAt: string | null;
  createdAt: string;
  qrCode?: string;
}

export interface GroupDto {
  id: string;
  externalGroupId: string;
  groupName: string;
  isActive: boolean;
  lastSyncAt: string | null;
  monitored?: boolean;
  priority?: number;
}

export interface MonitorGroupDto {
  groupId: string;
  monitoringEnabled: boolean;
  priority?: number;
}

// ─── Messages ─────────────────────────────────────────────────────────────────

export interface IncomingMessageDto {
  id: string;
  groupId: string;
  groupName?: string;
  senderName: string;
  senderNumber: string;
  messageText: string;
  receivedAt: string;
  createdAt: string;
  parsedMessage?: ParsedMessage;
  matchResult?: MatchResultDto;
}

export interface MatchResultDto {
  id: string;
  score: number;
  decision: MatchDecision;
  rationale: string;
  matchedFields: string[];
  classifierVersion: string;
  processedAt: string;
}

export interface OpportunityDto extends IncomingMessageDto {
  matchResult: MatchResultDto;
  outgoingMessage?: OutgoingMessageDto;
}

// ─── Outgoing ─────────────────────────────────────────────────────────────────

export interface OutgoingMessageDto {
  id: string;
  messageText: string;
  sendMode: AutoReplyMode;
  status: OutgoingMessageStatus;
  sentAt: string | null;
  createdAt: string;
}

// ─── Filters ─────────────────────────────────────────────────────────────────

export type UserFilterDto = UserFilter & {
  id?: string;
  userId?: string;
  createdAt?: string;
  updatedAt?: string;
};

// ─── Audit ────────────────────────────────────────────────────────────────────

export interface AuditLogDto {
  id: string;
  userId: string;
  eventType: string;
  entityType: string | null;
  entityId: string | null;
  payload: Record<string, unknown> | null;
  createdAt: string;
}

// ─── Classifier ───────────────────────────────────────────────────────────────

export interface ClassifyInput {
  messageText: string;
  normalizedText: string;
  userFilter: UserFilter;
  parsedContext: ParsedMessage;
}

export type { ClassifierResponse, ParsedMessage, UserFilter };

// ─── Health ────────────────────────────────────────────────────────────────────

export interface HealthDto {
  status: 'ok' | 'error';
  timestamp: string;
  services: {
    database: 'ok' | 'error';
    redis: 'ok' | 'error';
  };
}

// ─── Pagination ────────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
}

// ─── Shift Heuristics ─────────────────────────────────────────────────────────

export interface HeuristicResult {
  possibleShiftOffer: boolean;
  rejectionReason?: string;
  normalizedText: string;
  textHash: string;
  foundKeywords: string[];
  extractedMoneyValues: number[];
  extractedDates: string[];
  extractedShiftTypes: ShiftType[];
}
