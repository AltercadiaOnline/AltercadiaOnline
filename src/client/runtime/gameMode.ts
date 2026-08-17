/**
 * Toggle único Local × Online — Arquitetura de Dados Unificada.
 *
 * `online` = servidor autoritativo (WS). Caminho normal em localhost (`npm run dev`)
 * e em produção. Mesmo protocolo — dois browsers = dois jogadores.
 *
 * `local` = Mock 1 jogador (sem multiplayer). Escape hatch:
 * `npm run dev:mock` ou `?gameMode=local` (só localhost).
 *
 * Resolução:
 * 1. Host de produção → sempre `online`
 * 2. `?gameMode=local|online` na URL (localhost)
 * 3. `GET /config/client`.defaultGameMode (servidor)
 * 4. default `online`
 *
 * Não usa `localStorage` como fonte — preferência presa quebrava o caminho normal.
 * Produção nunca ativa Mock, mesmo com query.
 */

export type GameMode = 'local' | 'online';

const STALE_STORAGE_KEY = 'altercadia.gameMode';

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

function readWindowMode(): GameMode | null {
  if (typeof window === 'undefined') return null;
  const raw = window.__ALTERCADIA_GAME_MODE__;
  return raw === 'local' || raw === 'online' ? raw : null;
}

function clearStaleModeStorage(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STALE_STORAGE_KEY);
  } catch {
    /* ignore */
  }
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
  const fromQuery = readQueryMode();
  const resolved = clampModeForHost(
    fromQuery
    ?? readWindowMode()
    ?? 'online',
  );
  cachedMode = resolved;
  if (typeof window !== 'undefined') {
    window.__ALTERCADIA_GAME_MODE__ = resolved;
  }
  if (!fromQuery) {
    clearStaleModeStorage();
  }
  return cachedMode;
}

/**
 * Aplica o default do servidor depois de GET /config/client.
 * Query na URL continua ganhando; produção continua travada em online.
 */
export function applyServerDefaultGameMode(mode: GameMode): void {
  if (readQueryMode()) return;
  const next = clampModeForHost(mode);
  cachedMode = next;
  if (typeof window !== 'undefined') {
    window.__ALTERCADIA_GAME_MODE__ = next;
  }
  if (next === 'online') {
    clearStaleModeStorage();
  }
}

/** Define modo. `persist` legado — não grava mais localStorage (não é o caminho normal). */
export function setGameMode(mode: GameMode, _options?: { readonly persist?: boolean }): void {
  const next = clampModeForHost(mode);
  cachedMode = next;
  if (typeof window !== 'undefined') {
    window.__ALTERCADIA_GAME_MODE__ = next;
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
