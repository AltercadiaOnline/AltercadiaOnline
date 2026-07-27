import { initDebugMenu, type DebugMenuInitOptions } from './DebugMenu.js';
import { isLocalGameMode } from '../runtime/gameMode.js';

const PRODUCTION_HOSTS = new Set([
  'altercadia-online.vercel.app',
]);

/**
 * Shift+D / cheats só no local de verdade (localhost → GAME_MODE=local por padrão).
 * Vercel / online = espelho oficial — sem menu de debug.
 */
export function isDevDebugToolsEnabled(): boolean {
  if (typeof window === 'undefined') return false;

  const host = window.location.hostname.trim().toLowerCase();
  if (PRODUCTION_HOSTS.has(host)) return false;

  const localHost = host === 'localhost' || host === '127.0.0.1' || host.endsWith('.local');
  if (!localHost) return false;

  return isLocalGameMode();
}

export function initDebugMenuIfAllowed(options: DebugMenuInitOptions): (() => void) | null {
  if (!isDevDebugToolsEnabled()) {
    console.info('[DebugTools] Desativado — Shift+D só no localhost (modo local).');
    return null;
  }

  return initDebugMenu(options);
}

export { destroyDebugMenu } from './DebugMenu.js';
