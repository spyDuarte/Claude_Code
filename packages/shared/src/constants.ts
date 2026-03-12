import { ShiftType } from './enums';

// ─── Heuristic Keywords ────────────────────────────────────────────────────────

export const SHIFT_OPPORTUNITY_KEYWORDS: string[] = [
  'plantão',
  'plantao',
  'vaga',
  'cobre',
  'cobrir',
  'cobertura',
  'hospital',
  'upa',
  'emergência',
  'emergencia',
  'urgência',
  'urgencia',
  'cti',
  'uti',
  'diurno',
  'noturno',
  'valor',
  'remuneração',
  'remuneracao',
  'pagamento',
  'escala',
  'disponível',
  'disponivel',
  'turno',
  'médico',
  'medico',
  'clínico',
  'clinico',
];

export const SHIFT_NEGATIVE_KEYWORDS: string[] = [
  'cancelado',
  'cancelada',
  'preenchido',
  'preenchida',
  'fechado',
  'encerrado',
  'não precisa',
  'nao precisa',
  'dispensado',
];

// ─── Shift Type Keyword Mapping ────────────────────────────────────────────────

export const SHIFT_TYPE_KEYWORDS: Record<string, ShiftType> = {
  diurno: ShiftType.DIURNO,
  manhã: ShiftType.DIURNO,
  manha: ShiftType.DIURNO,
  tarde: ShiftType.DIURNO,
  noturno: ShiftType.NOTURNO,
  noite: ShiftType.NOTURNO,
  '12h': ShiftType.PLANTAO_12H,
  '12 h': ShiftType.PLANTAO_12H,
  '24h': ShiftType.PLANTAO_24H,
  '24 h': ShiftType.PLANTAO_24H,
  diarista: ShiftType.DIARISTA,
  sobreaviso: ShiftType.SOBREAVISO,
};

// ─── Brazilian Cities ─────────────────────────────────────────────────────────

export const COMMON_BRAZILIAN_CITIES: string[] = [
  'são paulo',
  'rio de janeiro',
  'belo horizonte',
  'salvador',
  'fortaleza',
  'curitiba',
  'manaus',
  'recife',
  'porto alegre',
  'belém',
  'goiânia',
  'guarulhos',
  'campinas',
  'são luís',
  'maceió',
  'natal',
  'teresina',
  'campo grande',
  'joão pessoa',
  'santo andré',
  'osasco',
  'ribeirão preto',
  'jaboatão',
  'uberlândia',
  'contagem',
  'sorocaba',
  'aracaju',
  'feira de santana',
  'cuiabá',
  'joinville',
  'juiz de fora',
  'londrina',
  'aparecida de goiânia',
  'ananindeua',
  'porto velho',
  'macapá',
  'florianópolis',
  'são bernardo do campo',
  'caxias do sul',
  'santos',
];

// ─── Money Regex ──────────────────────────────────────────────────────────────

export const MONEY_REGEX = /r\$\s*[\d.,]+|[\d.,]+\s*reais/gi;

// ─── Date Patterns ────────────────────────────────────────────────────────────

export const DATE_REGEX =
  /\b(\d{1,2})[\/\-\.](\d{1,2})(?:[\/\-\.](\d{2,4}))?\b|\b(hoje|amanhã|amanha|segunda|terça|terca|quarta|quinta|sexta|sábado|sabado|domingo)\b/gi;

// ─── Heuristic Thresholds ──────────────────────────────────────────────────────

export const HEURISTIC_MIN_KEYWORD_MATCHES = 1;
export const DEDUPLICATION_TTL_SECONDS = 3600; // 1 hour window
export const CLASSIFIER_VERSION = '1.0.0';
export const PARSER_VERSION = '1.0.0';
export const DEFAULT_AUTO_REPLY_THRESHOLD = 0.85;
export const DEFAULT_SEMI_AUTO_THRESHOLD = 0.6;
