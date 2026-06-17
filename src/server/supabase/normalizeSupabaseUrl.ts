/** Remove aspas acidentais ao colar variáveis no Railway/Vercel. */
export function sanitizeEnvSecret(value: string | undefined | null): string | null {
  if (value == null) return null;

  let trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"'))
    || (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    trimmed = trimmed.slice(1, -1).trim();
  }

  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Normaliza Project URL do Supabase.
 * Aceita domínio sem scheme e remove sufixos inválidos (/rest/v1).
 */
export function normalizeSupabaseProjectUrl(raw: string | undefined | null): string | null {
  const base = sanitizeEnvSecret(raw);
  if (!base) return null;

  let candidate = base.replace(/\/+$/, '').replace(/\/rest\/v1\/?$/i, '');

  if (!/^https?:\/\//i.test(candidate)) {
    candidate = `https://${candidate}`;
  }

  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return null;
  }
}

/** Normaliza URL pública do WebSocket (GAME_WS_URL). */
export function normalizeGameWsUrl(raw: string | undefined | null): string | null {
  const base = sanitizeEnvSecret(raw);
  if (!base) return null;

  let candidate = base.replace(/\/+$/, '');
  if (!/^wss?:\/\//i.test(candidate)) {
    const scheme = candidate.includes('localhost') || candidate.startsWith('127.0.0.1')
      ? 'ws'
      : 'wss';
    candidate = `${scheme}://${candidate}`;
  }

  if (!candidate.endsWith('/ws')) {
    candidate = `${candidate}/ws`;
  }

  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== 'ws:' && parsed.protocol !== 'wss:') {
      return null;
    }
    return parsed.toString().replace(/\/+$/, '');
  } catch {
    return null;
  }
}
