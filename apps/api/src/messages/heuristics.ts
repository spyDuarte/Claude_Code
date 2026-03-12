import {
  SHIFT_OPPORTUNITY_KEYWORDS,
  SHIFT_NEGATIVE_KEYWORDS,
  SHIFT_TYPE_KEYWORDS,
  MONEY_REGEX,
  DATE_REGEX,
  HEURISTIC_MIN_KEYWORD_MATCHES,
} from '@plantao-radar/shared';
import type { HeuristicResult } from '@plantao-radar/shared';
import { ShiftType } from '@plantao-radar/shared';
import { normalizeText, hashText } from './normalizer';

/**
 * Runs cheap, deterministic heuristics on a message to determine:
 * 1. Is it possibly a shift opportunity?
 * 2. What keywords, money values, dates, shift types can be extracted?
 *
 * This layer runs BEFORE the AI classifier to save costs.
 */
export function runHeuristics(rawText: string, blockedKeywords: string[] = []): HeuristicResult {
  const normalizedText = normalizeText(rawText);
  const textHash = hashText(normalizedText);

  // Early reject: blocked keywords
  for (const blocked of blockedKeywords) {
    const normalizedBlocked = normalizeText(blocked);
    if (normalizedText.includes(normalizedBlocked)) {
      return {
        possibleShiftOffer: false,
        rejectionReason: `Blocked keyword: "${blocked}"`,
        normalizedText,
        textHash,
        foundKeywords: [],
        extractedMoneyValues: [],
        extractedDates: [],
        extractedShiftTypes: [],
      };
    }
  }

  // Early reject: negative signals (slot already filled, cancelled, etc.)
  for (const neg of SHIFT_NEGATIVE_KEYWORDS) {
    if (normalizedText.includes(neg)) {
      return {
        possibleShiftOffer: false,
        rejectionReason: `Negative signal: "${neg}"`,
        normalizedText,
        textHash,
        foundKeywords: [],
        extractedMoneyValues: [],
        extractedDates: [],
        extractedShiftTypes: [],
      };
    }
  }

  // Keyword detection
  const foundKeywords: string[] = [];
  for (const kw of SHIFT_OPPORTUNITY_KEYWORDS) {
    if (normalizedText.includes(kw)) {
      foundKeywords.push(kw);
    }
  }

  // Not enough evidence
  if (foundKeywords.length < HEURISTIC_MIN_KEYWORD_MATCHES) {
    return {
      possibleShiftOffer: false,
      rejectionReason: 'No shift opportunity keywords found',
      normalizedText,
      textHash,
      foundKeywords,
      extractedMoneyValues: [],
      extractedDates: [],
      extractedShiftTypes: [],
    };
  }

  // Money extraction
  const moneyMatches = rawText.match(MONEY_REGEX) ?? [];
  const extractedMoneyValues = moneyMatches
    .map((m) => {
      const cleaned = m.replace(/[^\d.,]/g, '').replace(',', '.');
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? null : parsed;
    })
    .filter((v): v is number => v !== null);

  // Date extraction
  const dateMatches: string[] = [];
  const dateRe = new RegExp(DATE_REGEX.source, DATE_REGEX.flags);
  let m: RegExpExecArray | null;
  while ((m = dateRe.exec(rawText)) !== null) {
    dateMatches.push(m[0]);
  }

  // Shift type extraction
  const extractedShiftTypes: ShiftType[] = [];
  for (const [keyword, shiftType] of Object.entries(SHIFT_TYPE_KEYWORDS)) {
    if (normalizedText.includes(keyword) && !extractedShiftTypes.includes(shiftType)) {
      extractedShiftTypes.push(shiftType);
    }
  }

  return {
    possibleShiftOffer: true,
    normalizedText,
    textHash,
    foundKeywords,
    extractedMoneyValues,
    extractedDates: dateMatches,
    extractedShiftTypes,
  };
}

/**
 * Applies deterministic score penalties based on filter mismatches.
 * Returns a penalty score (0 to 1) to subtract from the AI classifier score.
 */
export function computeDeterministicPenalties(
  heuristic: HeuristicResult,
  filter: {
    minValue?: number | null;
    cities?: string[];
    blockedKeywords?: string[];
  },
): { penalty: number; reasons: string[] } {
  let penalty = 0;
  const reasons: string[] = [];

  // Below minimum value
  if (
    filter.minValue &&
    heuristic.extractedMoneyValues.length > 0 &&
    Math.max(...heuristic.extractedMoneyValues) < filter.minValue
  ) {
    penalty += 0.3;
    reasons.push(`Value below minimum (${filter.minValue})`);
  }

  return { penalty, reasons };
}
