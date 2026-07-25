/**
 * Política alinhada ao GAME_MODE unificado.
 * Local: permite mutações locais via ActionDispatcher (simula ACK).
 * Online: só servidor (Railway / monólito local em modo online).
 */
import { getGameMode, isLocalGameMode } from './gameMode.js';

export function allowsOfflineGameplayFallback(hostname?: string): boolean {
  if (isLocalGameMode()) return true;

  // Online: nunca mock — mesmo em localhost (ex.: ?gameMode=online).
  if (getGameMode() === 'online') return false;

  if (typeof hostname === 'string' && hostname.length > 0) {
    return hostname === 'localhost' || hostname === '127.0.0.1';
  }
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    return host === 'localhost' || host === '127.0.0.1';
  }
  return false;
}

/** Host de monólito local (npm run dev). */
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
