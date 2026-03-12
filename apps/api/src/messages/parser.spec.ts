import { parseMessage } from './parser';
import { runHeuristics } from './heuristics';

describe('parser', () => {
  it('extracts São Paulo from message text', () => {
    const text = 'Plantão disponível em São Paulo. Clínico médico. R$ 1800.';
    const heuristic = runHeuristics(text);
    const parsed = parseMessage(text, heuristic);

    expect(parsed.extractedCity).toBe('São Paulo');
  });

  it('extracts hospital from message text', () => {
    const text = 'Plantão no Hospital Einstein amanhã. Diurno 12h.';
    const heuristic = runHeuristics(text);
    const parsed = parseMessage(text, heuristic);

    expect(parsed.extractedHospital).toBeTruthy();
    expect(parsed.extractedHospital!.toLowerCase()).toContain('einstein');
  });

  it('extracts specialty from message', () => {
    const text = 'Vaga para clínico geral no hospital. R$ 2000.';
    const heuristic = runHeuristics(text);
    const parsed = parseMessage(text, heuristic);

    expect(parsed.extractedSpecialty).toBe('Clínica Médica');
  });

  it('extracts value from heuristic', () => {
    const text = 'Plantão R$ 1.800 noturno disponível.';
    const heuristic = runHeuristics(text);
    const parsed = parseMessage(text, heuristic);

    expect(parsed.extractedValue).toBeCloseTo(1800, 0);
  });

  it('marks as shift offer when heuristic passes', () => {
    const text = 'Plantão disponível clínico médico São Paulo.';
    const heuristic = runHeuristics(text);
    const parsed = parseMessage(text, heuristic);

    expect(parsed.possibleShiftOffer).toBe(heuristic.possibleShiftOffer);
  });

  it('matches user-configured hospitals', () => {
    const text = 'Plantão no Complexo Regional Norte. R$ 1500.';
    const heuristic = runHeuristics(text);
    const parsed = parseMessage(text, heuristic, ['Complexo Regional Norte']);

    expect(parsed.extractedHospital).toBe('Complexo Regional Norte');
  });
});
