import { AUTH_CALLBACK_PATH, isAuthCallbackPath } from '../shared/auth/authCallback.js';

export function syncAppPath(pathname: string): void {
  if (typeof window === 'undefined') return;
  const normalized = pathname.startsWith('/') ? pathname : `/${pathname}`;
  if (window.location.pathname === normalized) return;
  window.history.replaceState({}, document.title, `${normalized}${window.location.search}`);
}

export function showScreen(screenId: string): void {
  document.querySelectorAll('.screen').forEach((screen) => {
    (screen as HTMLElement).style.display = 'none';
  });

  const screen = document.getElementById(screenId);
  if (!screen) return;

  screen.style.display = screen.classList.contains('full-screen') ? 'flex' : 'block';

  if (screenId === 'char-select-screen') {
    syncAppPath(AUTH_CALLBACK_PATH);
  }
}

/** SPA fallback paths that must serve index.html (Railway static server). */
export function isSpaEntryPath(pathname: string): boolean {
  return pathname === '/' || isAuthCallbackPath(pathname);
}
