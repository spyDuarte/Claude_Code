import { hashText } from '../messages/normalizer';

// Unit test the hash-based deduplication key logic
// Full Redis integration tests would require a running Redis instance

describe('deduplication key logic', () => {
  it('same message produces same hash', () => {
    const text = 'plantao disponivel clinica medica sao paulo';
    expect(hashText(text)).toBe(hashText(text));
  });

  it('equivalent messages (different case/whitespace) produce same hash', () => {
    const text1 = 'PLANTÃO DISPONÍVEL';
    const text2 = 'plantão disponível';
    // After normalization both should produce same hash
    const normalize = (t: string) =>
      t
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim();

    expect(hashText(normalize(text1))).toBe(hashText(normalize(text2)));
  });

  it('different messages produce different hashes', () => {
    const hash1 = hashText('plantao noturno hospital einstein');
    const hash2 = hashText('vaga diurno upa centro');
    expect(hash1).not.toBe(hash2);
  });

  it('dedup key format is correct', () => {
    const userId = 'user-123';
    const groupId = 'group-456';
    const messageHash = hashText('some message text');
    const key = `dedup:${userId}:${groupId}:${messageHash}`;

    expect(key).toMatch(/^dedup:[^:]+:[^:]+:[0-9a-f]{32}$/);
  });
});
