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
 * 4. default: `online`
 *
 * Segurança: `local` só em localhost/127.0.0.1. Em produção (Vercel) sempre `online`,
 * mesmo se a URL ou o localStorage pedirem local — evita Mock na CDN.
 */

export type GameMode = 'local' | 'online';

const STORAGE_KEY = 'altercadia.gameMode';

declare global {
  interface Window {
    __ALTERCADIA_GAME_MODE__?: GameMode;
  }
}

function isLocalDevHost(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1';
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
  return 'online';
}

/** Força online fora de localhost — Mock nunca ativa na Vercel. */
function clampModeForHost(mode: GameMode): GameMode {
  if (mode === 'local' && !isLocalDevHost()) {
    return 'online';
  }
  return mode;
}

let cachedMode: GameMode | null = null;

/** Modo ativo (cache por sessão de página). */
export function getGameMode(): GameMode {
  if (cachedMode) return cachedMode;
  const resolved =
    readQueryMode()
    ?? readStorageMode()
    ?? readWindowMode()
    ?? defaultModeForHost();
  cachedMode = clampModeForHost(resolved);
  return cachedMode;
}

/** Define modo e persiste preferência (exceto quando veio só da query). */
export function setGameMode(mode: GameMode, options?: { readonly persist?: boolean }): void {
  const next = clampModeForHost(mode);
  cachedMode = next;
  if (typeof window !== 'undefined') {
    window.__ALTERCADIA_GAME_MODE__ = next;
    if (options?.persist !== false) {
      try {
        window.localStorage.setItem(STORAGE_KEY, next);
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
