import { runHeuristics, computeDeterministicPenalties } from './heuristics';

describe('heuristics', () => {
  describe('runHeuristics', () => {
    it('detects a clear shift opportunity message', () => {
      const text =
        'Plantão disponível! Hospital São Lucas, clínico geral, dia 15/06, noturno 12h. Valor: R$ 1.800.';
      const result = runHeuristics(text);

      expect(result.possibleShiftOffer).toBe(true);
      expect(result.foundKeywords.length).toBeGreaterThan(0);
      expect(result.extractedMoneyValues.length).toBeGreaterThan(0);
      expect(result.extractedMoneyValues[0]).toBeCloseTo(1800, 0);
    });

    it('rejects a non-shift message', () => {
      const text = 'Bom dia a todos! Como vocês estão?';
      const result = runHeuristics(text);

      expect(result.possibleShiftOffer).toBe(false);
      expect(result.rejectionReason).toBeDefined();
    });

    it('rejects a message with blocked keyword', () => {
      const text = 'Plantão disponível para ortopedista. R$ 2000.';
      const result = runHeuristics(text, ['ortopedista']);

      expect(result.possibleShiftOffer).toBe(false);
      expect(result.rejectionReason).toContain('Blocked keyword');
    });

    it('rejects a negative signal (cancelled shift)', () => {
      const text = 'Plantão cancelado. Não precisa mais comparecer.';
      const result = runHeuristics(text);

      expect(result.possibleShiftOffer).toBe(false);
      expect(result.rejectionReason).toBeDefined();
    });

    it('extracts multiple money values', () => {
      const text = 'Vaga disponível. Diurno R$ 1.500, noturno R$ 2.000.';
      const result = runHeuristics(text);

      expect(result.possibleShiftOffer).toBe(true);
      expect(result.extractedMoneyValues).toHaveLength(2);
    });

    it('extracts shift types', () => {
      const text = 'Plantão 12h noturno disponível no hospital.';
      const result = runHeuristics(text);

      expect(result.possibleShiftOffer).toBe(true);
      expect(result.extractedShiftTypes).toContain('NOTURNO');
      expect(result.extractedShiftTypes).toContain('PLANTAO_12H');
    });

    it('extracts dates', () => {
      const text = 'Plantão disponível dia 20/06 no hospital.';
      const result = runHeuristics(text);

      expect(result.possibleShiftOffer).toBe(true);
      expect(result.extractedDates.length).toBeGreaterThan(0);
    });

    it('produces a consistent hash for same normalized text', () => {
      const text1 = 'Plantão disponível';
      const text2 = 'PLANTÃO  DISPONÍVEL';
      const r1 = runHeuristics(text1);
      const r2 = runHeuristics(text2);

      expect(r1.textHash).toBe(r2.textHash);
    });
  });

  describe('computeDeterministicPenalties', () => {
    it('applies penalty when value is below minimum', () => {
      const heuristic = {
        possibleShiftOffer: true,
        normalizedText: '',
        textHash: '',
        foundKeywords: [],
        extractedMoneyValues: [800],
        extractedDates: [],
        extractedShiftTypes: [],
      };

      const { penalty, reasons } = computeDeterministicPenalties(heuristic, {
        minValue: 1500,
        cities: [],
        blockedKeywords: [],
      });

      expect(penalty).toBeGreaterThan(0);
      expect(reasons.length).toBeGreaterThan(0);
    });

    it('no penalty when value meets minimum', () => {
      const heuristic = {
        possibleShiftOffer: true,
        normalizedText: '',
        textHash: '',
        foundKeywords: [],
        extractedMoneyValues: [2000],
        extractedDates: [],
        extractedShiftTypes: [],
      };

      const { penalty } = computeDeterministicPenalties(heuristic, {
        minValue: 1500,
        cities: [],
        blockedKeywords: [],
      });

      expect(penalty).toBe(0);
    });
  });
});
