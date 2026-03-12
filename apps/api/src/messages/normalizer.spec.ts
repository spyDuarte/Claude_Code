import { normalizeText, hashText, lowercaseText } from './normalizer';

describe('normalizer', () => {
  describe('normalizeText', () => {
    it('lowercases text', () => {
      expect(normalizeText('PLANTÃO DISPONÍVEL')).toBe('plantao disponivel');
    });

    it('strips diacritics', () => {
      expect(normalizeText('clínica médica')).toBe('clinica medica');
    });

    it('collapses whitespace', () => {
      expect(normalizeText('  plantão   disponível  ')).toBe('plantao disponivel');
    });

    it('removes zero-width spaces', () => {
      expect(normalizeText('plan\u200btão')).toBe('plantao');
    });

    it('handles empty string', () => {
      expect(normalizeText('')).toBe('');
    });
  });

  describe('hashText', () => {
    it('produces consistent hashes for same input', () => {
      const text = 'plantao disponivel clinica medica';
      expect(hashText(text)).toBe(hashText(text));
    });

    it('produces different hashes for different inputs', () => {
      expect(hashText('abc')).not.toBe(hashText('def'));
    });

    it('returns 32 character hex string', () => {
      const hash = hashText('test');
      expect(hash).toHaveLength(32);
      expect(hash).toMatch(/^[0-9a-f]{32}$/);
    });
  });

  describe('lowercaseText', () => {
    it('preserves accents while lowercasing', () => {
      expect(lowercaseText('Clínica Médica')).toBe('clínica médica');
    });

    it('collapses whitespace', () => {
      expect(lowercaseText('  São  Paulo  ')).toBe('são paulo');
    });
  });
});
