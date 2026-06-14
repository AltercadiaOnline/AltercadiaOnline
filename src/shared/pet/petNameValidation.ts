const MIN_LEN = 2;
const MAX_LEN = 16;
const NAME_PATTERN = /^[\p{L}\p{N}][\p{L}\p{N}\s'.-]*$/u;

export function sanitizePetDisplayName(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim().replace(/\s+/g, ' ');
  if (trimmed.length < MIN_LEN || trimmed.length > MAX_LEN) return null;
  if (!NAME_PATTERN.test(trimmed)) return null;
  return trimmed;
}

export function validatePetDisplayName(raw: string): { readonly ok: true; readonly name: string } | { readonly ok: false; readonly reason: string } {
  const name = sanitizePetDisplayName(raw);
  if (!name) {
    return {
      ok: false,
      reason: `Nome deve ter ${MIN_LEN}–${MAX_LEN} caracteres (letras, números ou espaços).`,
    };
  }
  return { ok: true, name };
}
