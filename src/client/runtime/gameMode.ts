/**
 * Toggle único Local × Online — Arquitetura de Dados Unificada.
 *
 * Local: ActionDispatcher aplica a intenção no espelho (simula ACK) + save local.
 * Online: ActionDispatcher emite player-intent; Zustand só após confirmação/snapshot.
 *
 * Resolução (primeira que bater):
 * 1. `?gameMode=local|online` na URL
 * 2. `localStorage.altercadia.gameMode`
 * 3. `window.__ALTERCADIA_GAME_MODE__`
 * 4. default: `online` (localhost monólito = Railway; simulador: `?gameMode=local`)
 */

export type GameMode = 'local' | 'online';

const STORAGE_KEY = 'altercadia.gameMode';

declare global {
  interface Window {
    __ALTERCADIA_GAME_MODE__?: GameMode;
  }
}

function readQueryMode(): GameMode | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = new URLSearchParams(window.location.search).get('gameMode');
    if (raw === 'local' || raw === 'online') return raw;
  } catch {
    /* ignore */
  }
  return null;
}

function readStorageMode(): GameMode | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === 'local' || raw === 'online') return raw;
  } catch {
    /* ignore */
  }
  return null;
}

function readWindowMode(): GameMode | null {
  if (typeof window === 'undefined') return null;
  const raw = window.__ALTERCADIA_GAME_MODE__;
  return raw === 'local' || raw === 'online' ? raw : null;
}

function defaultModeForHost(): GameMode {
  if (typeof window === 'undefined') return 'online';
  // Localhost monólito = mesmo caminho online (WS local). Simulador: ?gameMode=local
  return 'online';
}

let cachedMode: GameMode | null = null;

/** Modo ativo (cache por sessão de página). */
export function getGameMode(): GameMode {
  if (cachedMode) return cachedMode;
  cachedMode =
    readQueryMode()
    ?? readStorageMode()
    ?? readWindowMode()
    ?? defaultModeForHost();
  return cachedMode;
}

/** Define modo e persiste preferência (exceto quando veio só da query). */
export function setGameMode(mode: GameMode, options?: { readonly persist?: boolean }): void {
  cachedMode = mode;
  if (typeof window !== 'undefined') {
    window.__ALTERCADIA_GAME_MODE__ = mode;
    if (options?.persist !== false) {
      try {
        window.localStorage.setItem(STORAGE_KEY, mode);
      } catch {
        /* ignore */
      }
    }
  }
}

export function isLocalGameMode(): boolean {
  return getGameMode() === 'local';
}

export function isOnlineGameMode(): boolean {
  return getGameMode() === 'online';
}

/** Reinicia cache (testes / troca explícita antes do boot). */
export function resetGameModeCache(): void {
  cachedMode = null;
}
