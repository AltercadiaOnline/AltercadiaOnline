import { initDebugMenu, type DebugMenuInitOptions } from './DebugMenu.js';

const PRODUCTION_HOSTS = new Set([
  'altercadia-online.vercel.app',
]);

/**
 * Ferramentas de debug/cheat ficam desligadas em hosts de produção.
 * Em ambientes locais, o DebugMenu ainda exige allowlist de e-mail.
 */
export function isDevDebugToolsEnabled(): boolean {
  if (typeof window === 'undefined') return false;

  const host = window.location.hostname.trim().toLowerCase();
  if (PRODUCTION_HOSTS.has(host)) return false;

  return host === 'localhost' || host === '127.0.0.1' || host.endsWith('.local');
}

export function initDebugMenuIfAllowed(options: DebugMenuInitOptions): (() => void) | null {
  if (!isDevDebugToolsEnabled()) {
    console.info('[DebugTools] Desativado neste ambiente.');
    return null;
  }

  return initDebugMenu(options);
}

export { destroyDebugMenu } from './DebugMenu.js';
