import { COMMON_BRAZILIAN_CITIES, PARSER_VERSION } from '@plantao-radar/shared';
import { ShiftType } from '@plantao-radar/shared';
import type { ParsedMessage } from '@plantao-radar/shared';
import type { HeuristicResult } from '@plantao-radar/shared';
import { lowercaseText } from './normalizer';

/**
 * Extracts structured fields from a message using heuristic context.
 * This supplements the AI classifier output with deterministic parsing.
 */
export function parseMessage(
  rawText: string,
  heuristic: HeuristicResult,
  knownHospitals: string[] = [],
): ParsedMessage {
  const lowerText = lowercaseText(rawText);

  const extractedCity = extractCity(lowerText);
  const extractedHospital = extractHospital(lowerText, knownHospitals);
  const extractedShift = heuristic.extractedShiftTypes[0] ?? null;
  const extractedValue = heuristic.extractedMoneyValues[0] ?? null;
  const extractedDate = heuristic.extractedDates[0] ?? null;
  const extractedSpecialty = extractSpecialty(lowerText);

  return {
    possibleShiftOffer: heuristic.possibleShiftOffer,
    extractedCity: extractedCity ?? undefined,
    extractedHospital: extractedHospital ?? undefined,
    extractedDate: extractedDate ?? undefined,
    extractedShift: (extractedShift as ShiftType) ?? undefined,
    extractedValue: extractedValue ?? undefined,
    extractedSpecialty: extractedSpecialty ?? undefined,
    extractedKeywords: heuristic.foundKeywords,
    parserVersion: PARSER_VERSION,
  };
}

function extractCity(lowerText: string): string | null {
  for (const city of COMMON_BRAZILIAN_CITIES) {
    if (lowerText.includes(city)) {
      return city
        .split(' ')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
    }
  }
  return null;
}

function extractHospital(lowerText: string, knownHospitals: string[]): string | null {
  // Check user-configured hospitals first
  for (const hospital of knownHospitals) {
    if (lowerText.includes(hospital.toLowerCase())) {
      return hospital;
    }
  }

  // Common hospital patterns
  const hospitalPatterns = [
    /hospital\s+[\w\s]+/i,
    /upa\s+[\w\s]*/i,
    /hc\s+[\w\s]*/i,
    /unidade\s+[\w\s]+/i,
    /einstein/i,
    /s[íi]rio/i,
    /albert\s+einstein/i,
    /das\s+cl[íi]nicas/i,
    /benefic[eê]ncia/i,
  ];

  for (const pattern of hospitalPatterns) {
    const match = lowerText.match(pattern);
    if (match) {
      const name = match[0].trim();
      return name.charAt(0).toUpperCase() + name.slice(1);
    }
  }

  return null;
}

function extractSpecialty(lowerText: string): string | null {
  const specialtyMap: Record<string, string> = {
    'cl[íi]nico': 'Clínica Médica',
    'cl[íi]nica m[ée]dica': 'Clínica Médica',
    'cl[íi]nica geral': 'Clínica Médica',
    cardio: 'Cardiologia',
    cardiologia: 'Cardiologia',
    ortoped: 'Ortopedia',
    ortopedia: 'Ortopedia',
    pediatr: 'Pediatria',
    pediatria: 'Pediatria',
    ginecolog: 'Ginecologia',
    psiquiatr: 'Psiquiatria',
    neurolog: 'Neurologia',
    cirurgi: 'Cirurgia Geral',
    'cirurgia geral': 'Cirurgia Geral',
    anestesiol: 'Anestesiologia',
    radiolog: 'Radiologia',
    dermatolog: 'Dermatologia',
    urol: 'Urologia',
    oftalmo: 'Oftalmologia',
    otorrinol: 'Otorrinolaringologia',
  };

  for (const [pattern, specialty] of Object.entries(specialtyMap)) {
    if (new RegExp(pattern, 'i').test(lowerText)) {
      return specialty;
    }
  }

  return null;
}
