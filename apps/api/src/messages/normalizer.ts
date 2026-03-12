import * as crypto from 'crypto';

/**
 * Normalizes a raw message text for heuristic processing.
 * - Lowercases
 * - Removes excess whitespace
 * - Strips zero-width characters
 * - Normalizes unicode
 */
export function normalizeText(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics for matching
    .toLowerCase()
    .replace(/\u200b/g, '') // zero-width space
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Produces a stable SHA-256 hash for deduplication purposes.
 * Uses the normalized text to ensure equivalent messages map to same hash.
 */
export function hashText(normalizedText: string): string {
  return crypto.createHash('sha256').update(normalizedText).digest('hex').slice(0, 32);
}

/**
 * Preserves accents but lowercases — for display/matching with accent-sensitive data.
 */
export function lowercaseText(raw: string): string {
  return raw.toLowerCase().replace(/\s+/g, ' ').trim();
}
