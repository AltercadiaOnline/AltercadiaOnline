export const OAUTH_PENDING_KEY = 'altercadia.oauth_pending';
export const OAUTH_AUTO_CHAR_CREATE_KEY = 'altercadia.oauth_auto_char_create';

/** localStorage — sobrevive ao redirect Google → Railway (mesma origem). */
export function markOAuthRedirectPending(): void {
  localStorage.setItem(OAUTH_PENDING_KEY, '1');
  localStorage.setItem(OAUTH_AUTO_CHAR_CREATE_KEY, '1');
}

export function isOAuthRedirectPending(): boolean {
  return localStorage.getItem(OAUTH_PENDING_KEY) === '1';
}

export function shouldAutoOpenCharacterCreateAfterOAuth(): boolean {
  return localStorage.getItem(OAUTH_AUTO_CHAR_CREATE_KEY) === '1';
}

export function clearOAuthRedirectPending(): void {
  localStorage.removeItem(OAUTH_PENDING_KEY);
}

export function clearOAuthAutoCharCreate(): void {
  localStorage.removeItem(OAUTH_AUTO_CHAR_CREATE_KEY);
}

export function clearAllOAuthFlags(): void {
  clearOAuthRedirectPending();
  clearOAuthAutoCharCreate();
}

/** PKCE callback — ?code= na URL após redirect do Google. */
export function hasOAuthCallbackInUrl(): boolean {
  if (typeof window === 'undefined') return false;
  const url = new URL(window.location.href);
  return url.searchParams.has('code') || url.searchParams.has('error');
}
