/** Rota do SPA após OAuth / confirmação de email — char select. */
export const AUTH_CALLBACK_PATH = '/characters';

/** Rotas legadas que redirecionamos para `/characters`. */
export const AUTH_CALLBACK_LEGACY_PATHS = ['/game'] as const;

export function isAuthCallbackPath(pathname: string): boolean {
  const path = pathname.trim() || '/';
  if (path === AUTH_CALLBACK_PATH || path.startsWith(`${AUTH_CALLBACK_PATH}/`)) {
    return true;
  }
  return (AUTH_CALLBACK_LEGACY_PATHS as readonly string[]).includes(path);
}

/** Origin do front-end onde o jogador iniciou login (Vercel ou Railway). */
export function resolvePublicFrontendOrigin(): string {
  if (typeof window === 'undefined') return '';
  return window.location.origin.replace(/\/+$/, '');
}

/** URL completa para redirectTo / emailRedirectTo do Supabase. */
export function buildAuthRedirectUrl(origin?: string): string {
  const base = (origin ?? resolvePublicFrontendOrigin()).replace(/\/+$/, '');
  if (!base) return AUTH_CALLBACK_PATH;
  return `${base}${AUTH_CALLBACK_PATH}`;
}

/** Normaliza callback para `/characters` (evita cair na raiz `/` da Vercel). */
export function resolveAuthCallbackPath(currentPathname?: string): string {
  const raw = currentPathname?.trim() || '';
  if (!raw || raw === '/' || raw === AUTH_CALLBACK_PATH) {
    return AUTH_CALLBACK_PATH;
  }
  if ((AUTH_CALLBACK_LEGACY_PATHS as readonly string[]).includes(raw)) {
    return AUTH_CALLBACK_PATH;
  }
  if (raw.startsWith(`${AUTH_CALLBACK_PATH}/`)) {
    return AUTH_CALLBACK_PATH;
  }
  return AUTH_CALLBACK_PATH;
}

/** URL contém tokens de retorno Supabase (?code=, #access_token=, token_hash, etc.). */
export function hasAuthTokensInUrl(href?: string): boolean {
  if (hasOAuthCodeInUrl(href)) return true;
  return hasEmailConfirmationCallbackInUrl(href);
}

/** PKCE OAuth — ?code= ou erro na query (Google). */
export function hasOAuthCodeInUrl(href?: string): boolean {
  const url = parseAuthCallbackUrl(href);
  if (!url) return false;
  return url.searchParams.has('code') || url.searchParams.has('error');
}

/** Link de confirmação de email / recovery — não confundir com OAuth Google. */
export function hasEmailConfirmationCallbackInUrl(href?: string): boolean {
  const url = parseAuthCallbackUrl(href);
  if (!url) return false;

  const queryType = url.searchParams.get('type');
  if (url.searchParams.has('token_hash') && queryType) {
    return isEmailOtpType(queryType);
  }

  const hash = url.hash;
  if (!hash) return false;

  if (/type=(signup|recovery|email|magiclink|invite)/.test(hash)) {
    return true;
  }

  // Sessão implícita no hash após link de email (PKCE OAuth usa ?code= na query).
  if (/access_token=/.test(hash) && !url.searchParams.has('code')) {
    return true;
  }

  return false;
}

function isEmailOtpType(type: string): boolean {
  return type === 'signup'
    || type === 'email'
    || type === 'recovery'
    || type === 'magiclink'
    || type === 'invite';
}

function parseAuthCallbackUrl(href?: string): URL | null {
  const target = href
    ?? (typeof window !== 'undefined' ? window.location.href : '');
  if (!target) return null;

  try {
    return new URL(target);
  } catch {
    return null;
  }
}

/** Se Supabase caiu na raiz com tokens, normaliza para `/characters` no mesmo host. */
export function normalizeAuthCallbackLocationIfNeeded(): boolean {
  if (typeof window === 'undefined') return false;
  if (!hasAuthTokensInUrl()) return false;

  const path = window.location.pathname || '/';
  if (isAuthCallbackPath(path)) return false;

  const target = `${resolveAuthCallbackPath(path)}${window.location.search}${window.location.hash}`;
  window.location.replace(target);
  return true;
}
