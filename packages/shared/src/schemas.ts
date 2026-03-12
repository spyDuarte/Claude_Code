import { z } from 'zod';
import { AutoReplyMode, MatchDecision, RecommendedAction, ShiftType } from './enums';

// ─── Classifier Response ────────────────────────────────────────────────────

export const ClassifierResponseSchema = z.object({
  score: z.number().min(0).max(1),
  compatible: z.boolean(),
  shortReason: z.string().max(300),
  extractedLocation: z.string().nullable().optional(),
  extractedHospital: z.string().nullable().optional(),
  extractedShiftType: z.nativeEnum(ShiftType).nullable().optional(),
  extractedDate: z.string().nullable().optional(),
  extractedValue: z.number().nullable().optional(),
  urgency: z.enum(['low', 'medium', 'high']).default('low'),
  recommendedAction: z.nativeEnum(RecommendedAction),
  suggestedReply: z.string().nullable().optional(),
});

export type ClassifierResponse = z.infer<typeof ClassifierResponseSchema>;

// ─── User Filter ─────────────────────────────────────────────────────────────

export const UserFilterSchema = z.object({
  specialty: z.string().min(1).max(100),
  cities: z.array(z.string()).default([]),
  hospitals: z.array(z.string()).default([]),
  minValue: z.number().min(0).nullable().optional(),
  maxDistanceKm: z.number().min(0).nullable().optional(),
  acceptedShifts: z.array(z.nativeEnum(ShiftType)).default([]),
  requiredKeywords: z.array(z.string()).default([]),
  blockedKeywords: z.array(z.string()).default([]),
  autoReplyMode: z.nativeEnum(AutoReplyMode).default(AutoReplyMode.DISABLED),
  autoReplyThreshold: z.number().min(0).max(1).default(0.85),
  semiAutoThreshold: z.number().min(0).max(1).default(0.6),
  replyTemplate: z.string().max(1000).nullable().optional(),
});

export type UserFilter = z.infer<typeof UserFilterSchema>;

// ─── Incoming Webhook Payload ────────────────────────────────────────────────

export const IncomingWebhookMessageSchema = z.object({
  externalMessageId: z.string(),
  externalGroupId: z.string(),
  senderName: z.string(),
  senderNumber: z.string(),
  messageText: z.string(),
  receivedAt: z.string().datetime().optional(),
  rawPayload: z.record(z.unknown()).optional(),
});

export type IncomingWebhookMessage = z.infer<typeof IncomingWebhookMessageSchema>;

// ─── Parsed Message ───────────────────────────────────────────────────────────

export const ParsedMessageSchema = z.object({
  possibleShiftOffer: z.boolean(),
  extractedCity: z.string().nullable().optional(),
  extractedHospital: z.string().nullable().optional(),
  extractedDate: z.string().nullable().optional(),
  extractedShift: z.nativeEnum(ShiftType).nullable().optional(),
  extractedValue: z.number().nullable().optional(),
  extractedSpecialty: z.string().nullable().optional(),
  extractedKeywords: z.array(z.string()).default([]),
  parserVersion: z.string().default('1.0.0'),
});

export type ParsedMessage = z.infer<typeof ParsedMessageSchema>;

// ─── Match Result ─────────────────────────────────────────────────────────────

export const MatchResultSchema = z.object({
  score: z.number().min(0).max(1),
  decision: z.nativeEnum(MatchDecision),
  rationale: z.string(),
  matchedFields: z.array(z.string()).default([]),
  classifierVersion: z.string().default('1.0.0'),
});

export type MatchResult = z.infer<typeof MatchResultSchema>;

// ─── API Response Shapes ───────────────────────────────────────────────────────

export const ApiErrorSchema = z.object({
  statusCode: z.number(),
  message: z.string(),
  error: z.string().optional(),
});

export type ApiError = z.infer<typeof ApiErrorSchema>;
