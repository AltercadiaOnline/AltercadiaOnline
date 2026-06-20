export const OAUTH_PENDING_KEY = 'altercadia.oauth_pending';

/** localStorage — sobrevive ao redirect Google → Vercel (mesma origem). */
export function markOAuthRedirectPending(): void {
  localStorage.setItem(OAUTH_PENDING_KEY, '1');
}

export function isOAuthRedirectPending(): boolean {
  return localStorage.getItem(OAUTH_PENDING_KEY) === '1';
}

export function clearOAuthRedirectPending(): void {
  localStorage.removeItem(OAUTH_PENDING_KEY);
}

/** PKCE callback — ?code= na URL após redirect do Google. */
export function hasOAuthCallbackInUrl(): boolean {
  if (typeof window === 'undefined') return false;
  const url = new URL(window.location.href);
  return url.searchParams.has('code') || url.searchParams.has('error');
}
