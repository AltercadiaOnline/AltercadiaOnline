import {
  hasEmailConfirmationCallbackInUrl,
  hasOAuthCodeInUrl,
} from '../../../shared/auth/authCallback.js';

export const OAUTH_PENDING_KEY = 'altercadia.oauth_pending';
export const OAUTH_PENDING_AT_KEY = 'altercadia.oauth_pending_at';
export const OAUTH_AUTO_CHAR_CREATE_KEY = 'altercadia.oauth_auto_char_create';
export const EMAIL_CONFIRM_RETURN_KEY = 'altercadia.email_confirm_return';

/** sessionStorage — sobrevive ao exchange que limpa a URL antes do init. */
export function markEmailConfirmationReturnPending(): void {
  sessionStorage.setItem(EMAIL_CONFIRM_RETURN_KEY, '1');
}

export function consumeEmailConfirmationReturn(): boolean {
  if (sessionStorage.getItem(EMAIL_CONFIRM_RETURN_KEY) !== '1') return false;
  sessionStorage.removeItem(EMAIL_CONFIRM_RETURN_KEY);
  return true;
}

/** Abandono de redirect Google — não bloquear login/cadastro por email depois. */
const OAUTH_PENDING_TTL_MS = 10 * 60 * 1000;

/** localStorage — sobrevive ao redirect Google (mesma origem). */
export function markOAuthRedirectPending(): void {
  localStorage.setItem(OAUTH_PENDING_KEY, '1');
  localStorage.setItem(OAUTH_PENDING_AT_KEY, String(Date.now()));
  localStorage.setItem(OAUTH_AUTO_CHAR_CREATE_KEY, '1');
}

export function isOAuthRedirectPending(): boolean {
  if (localStorage.getItem(OAUTH_PENDING_KEY) !== '1') return false;

  const startedAt = Number(localStorage.getItem(OAUTH_PENDING_AT_KEY) ?? 0);
  if (startedAt > 0 && Date.now() - startedAt > OAUTH_PENDING_TTL_MS) {
    clearAllOAuthFlags();
    return false;
  }

  return true;
}

export function shouldAutoOpenCharacterCreateAfterOAuth(): boolean {
  return localStorage.getItem(OAUTH_AUTO_CHAR_CREATE_KEY) === '1';
}

export function clearOAuthRedirectPending(): void {
  localStorage.removeItem(OAUTH_PENDING_KEY);
  localStorage.removeItem(OAUTH_PENDING_AT_KEY);
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
  return hasOAuthCodeInUrl();
}

export { hasEmailConfirmationCallbackInUrl };
