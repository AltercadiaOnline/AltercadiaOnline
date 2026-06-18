/** Host esperado: `<project-ref>.supabase.co` ou `.supabase.in`. */
const SUPABASE_PROJECT_HOST_PATTERN = /^[a-z0-9-]+\.supabase\.(co|in)$/i;

export function extractSupabaseProjectHost(projectUrl: string): string | null {
  try {
    return new URL(projectUrl).hostname;
  } catch {
    return null;
  }
}

export function isSupabaseProjectHost(hostname: string): boolean {
  return SUPABASE_PROJECT_HOST_PATTERN.test(hostname.trim());
}

export type SupabaseProjectUrlValidation =
  | { readonly ok: true; readonly host: string }
  | { readonly ok: false; readonly reason: string };

/** Rejeita URLs comuns trocadas no Railway (ex.: URL do próprio deploy). */
export function validateSupabaseProjectUrl(projectUrl: string): SupabaseProjectUrlValidation {
  let parsed: URL;
  try {
    parsed = new URL(projectUrl);
  } catch {
    return { ok: false, reason: 'SUPABASE_URL malformada — use https://SEU_REF.supabase.co' };
  }

  const host = parsed.hostname.toLowerCase();
  if (isSupabaseProjectHost(host)) {
    return { ok: true, host };
  }

  if (host.includes('railway.app') || host.includes('vercel.app') || host.includes('localhost')) {
    return {
      ok: false,
      reason:
        'SUPABASE_URL aponta para o deploy (Railway/Vercel/local), não para o Supabase. '
        + 'No dashboard Supabase: Settings → API → Project URL (https://xxxx.supabase.co).',
    };
  }

  if (host.includes('supabase.com')) {
    return {
      ok: false,
      reason:
        'SUPABASE_URL aponta para supabase.com (dashboard). Use a Project URL: https://SEU_REF.supabase.co',
    };
  }

  return {
    ok: false,
    reason: `Host "${host}" não é um projeto Supabase (*.supabase.co). Verifique Settings → API.`,
  };
}

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
