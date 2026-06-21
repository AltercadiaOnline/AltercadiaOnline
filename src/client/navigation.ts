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

const REACT_SCREEN_IDS = new Set(['login-screen', 'char-select-screen']);

/** Troca telas — shells `.screen` legado + `#screen-react-root` para auth/char. */
export function showScreen(screenId: string): void {
  document.querySelectorAll('.screen').forEach((node) => {
    const screen = node as HTMLElement;
    screen.classList.add('hidden');
    screen.toggleAttribute('aria-hidden', true);
    screen.style.removeProperty('display');
  });

  const target = document.getElementById(screenId);
  const reactScreenShell = REACT_SCREEN_IDS.has(screenId);

  if (target && !reactScreenShell) {
    target.classList.remove('hidden');
    target.toggleAttribute('aria-hidden', false);
  }

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
