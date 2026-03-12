import { MatchDecision } from '@plantao-radar/shared';

// Decision engine logic (extracted for unit testing)
function computeDecision(
  score: number,
  autoThreshold: number,
  semiThreshold: number,
): MatchDecision {
  if (score >= autoThreshold) return MatchDecision.AUTO_SEND;
  if (score >= semiThreshold) return MatchDecision.REVIEW;
  return MatchDecision.REJECTED;
}

describe('decision engine', () => {
  const autoThreshold = 0.85;
  const semiThreshold = 0.6;

  it('returns AUTO_SEND when score >= autoThreshold', () => {
    expect(computeDecision(0.85, autoThreshold, semiThreshold)).toBe(MatchDecision.AUTO_SEND);
    expect(computeDecision(0.95, autoThreshold, semiThreshold)).toBe(MatchDecision.AUTO_SEND);
    expect(computeDecision(1.0, autoThreshold, semiThreshold)).toBe(MatchDecision.AUTO_SEND);
  });

  it('returns REVIEW when score is between semiThreshold and autoThreshold', () => {
    expect(computeDecision(0.75, autoThreshold, semiThreshold)).toBe(MatchDecision.REVIEW);
    expect(computeDecision(0.6, autoThreshold, semiThreshold)).toBe(MatchDecision.REVIEW);
    expect(computeDecision(0.84, autoThreshold, semiThreshold)).toBe(MatchDecision.REVIEW);
  });

  it('returns REJECTED when score < semiThreshold', () => {
    expect(computeDecision(0.59, autoThreshold, semiThreshold)).toBe(MatchDecision.REJECTED);
    expect(computeDecision(0.3, autoThreshold, semiThreshold)).toBe(MatchDecision.REJECTED);
    expect(computeDecision(0.0, autoThreshold, semiThreshold)).toBe(MatchDecision.REJECTED);
  });

  it('handles exact boundary values correctly', () => {
    expect(computeDecision(autoThreshold, autoThreshold, semiThreshold)).toBe(
      MatchDecision.AUTO_SEND,
    );
    expect(computeDecision(semiThreshold, autoThreshold, semiThreshold)).toBe(
      MatchDecision.REVIEW,
    );
    expect(computeDecision(semiThreshold - 0.001, autoThreshold, semiThreshold)).toBe(
      MatchDecision.REJECTED,
    );
  });

  it('handles custom thresholds', () => {
    expect(computeDecision(0.7, 0.7, 0.5)).toBe(MatchDecision.AUTO_SEND);
    expect(computeDecision(0.6, 0.7, 0.5)).toBe(MatchDecision.REVIEW);
    expect(computeDecision(0.4, 0.7, 0.5)).toBe(MatchDecision.REJECTED);
  });
});
