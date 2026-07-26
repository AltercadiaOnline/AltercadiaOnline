import { getGameMode, isLocalGameMode } from './gameMode.js';

/**
 * Hosts onde o simulador local (Mock) é permitido.
 * Produção (Vercel / domínio) nunca — mesmo com ?gameMode=local.
 */
export function isLocalDevHost(hostname?: string): boolean {
  if (typeof hostname === 'string' && hostname.length > 0) {
    return hostname === 'localhost' || hostname === '127.0.0.1';
  }
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    return host === 'localhost' || host === '127.0.0.1';
  }
  return false;
}

/**
 * Mock / save local só em localhost + GAME_MODE=local.
 * Online (e qualquer host de produção) → sempre false.
 */
export function allowsOfflineGameplayFallback(hostname?: string): boolean {
  if (getGameMode() === 'online') return false;
  if (!isLocalGameMode()) return false;
  return isLocalDevHost(hostname);
}
