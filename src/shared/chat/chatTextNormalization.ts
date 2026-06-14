/** Substituições comuns de leetspeak / evasão (4→a, 0→o, etc.). */
const LEET_CHAR_MAP: Readonly<Record<string, string>> = {
  '@': 'a',
  '4': 'a',
  '8': 'b',
  '(': 'c',
  '{': 'c',
  '<': 'c',
  '3': 'e',
  '€': 'e',
  '6': 'g',
  '9': 'g',
  '1': 'i',
  '!': 'i',
  '|': 'i',
  '0': 'o',
  '5': 's',
  '$': 's',
  '7': 't',
  '+': 't',
  '2': 'z',
};

function mapLeetChar(char: string): string {
  const lower = char.toLowerCase();
  if (/[a-z]/.test(lower)) return lower;
  return LEET_CHAR_MAP[lower] ?? '';
}

/**
 * Compacta texto removendo separadores — detecta p.o.r.n, p0rn, p@rn.
 */
export function compactForModeration(text: string): string {
  let out = '';
  for (const char of text.toLowerCase()) {
    out += mapLeetChar(char);
  }
  return out;
}

/**
 * Normaliza espaços e leetspeak mantendo limites de palavra.
 */
export function normalizeSpacedForModeration(text: string): string {
  let out = '';
  for (const char of text.toLowerCase()) {
    const mapped = mapLeetChar(char);
    if (mapped) {
      out += mapped;
    } else if (/\s/.test(char)) {
      out += ' ';
    } else {
      out += ' ';
    }
  }
  return out.replace(/\s+/g, ' ').trim();
}

/** Variantes usadas na checagem — original + normalizadas. */
export function moderationTextVariants(text: string): readonly string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const spaced = normalizeSpacedForModeration(trimmed);
  const compact = compactForModeration(trimmed);

  const variants = new Set<string>([trimmed, spaced, compact]);
  return [...variants].filter((entry) => entry.length > 0);
}
