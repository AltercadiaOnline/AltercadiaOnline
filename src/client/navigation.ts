import { AUTH_CALLBACK_PATH, isAuthCallbackPath } from '../shared/auth/authCallback.js';
import { getAppScreenBridge } from './app/bridge/appScreenBridge.js';
import {
  syncReactBattleHudVisibility,
  syncReactScreenShellVisibility,
  syncReactHudVisibility,
} from './app/shell/clientArchitecture.js';

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
  getAppScreenBridge().setActiveScreen(screenId);
  syncReactScreenShellVisibility(screenId);
  syncReactHudVisibility(screenId);
  syncReactBattleHudVisibility(screenId);

  if (screenId === 'char-select-screen') {
    syncAppPath(AUTH_CALLBACK_PATH);
  }
}

/** SPA fallback paths that must serve index.html (Railway static server). */
export function isSpaEntryPath(pathname: string): boolean {
  return pathname === '/' || isAuthCallbackPath(pathname);
}
