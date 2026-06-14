export const OAUTH_PENDING_KEY = 'altercadia.oauth_pending';

export function markOAuthRedirectPending(): void {
  sessionStorage.setItem(OAUTH_PENDING_KEY, '1');
}

export function isOAuthRedirectPending(): boolean {
  return sessionStorage.getItem(OAUTH_PENDING_KEY) === '1';
}

export function clearOAuthRedirectPending(): void {
  sessionStorage.removeItem(OAUTH_PENDING_KEY);
}
