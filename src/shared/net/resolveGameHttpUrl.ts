import type { PublicClientConfig } from '../publicClientConfig.js';

/** Deriva base HTTP a partir de wss://host/ws → https://host */
export function deriveGameHttpUrlFromWsUrl(gameWsUrl: string): string | null {
  const trimmed = gameWsUrl.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed);
    const protocol = parsed.protocol === 'wss:' ? 'https:' : parsed.protocol === 'ws:' ? 'http:' : parsed.protocol;
    return `${protocol}//${parsed.host}`.replace(/\/+$/, '');
  } catch {
    return null;
  }
}

/**
 * Base HTTP do servidor de jogo (Railway).
 * Prioridade: gameHttpUrl → derivado de gameWsUrl → mesma origem (monólito local).
 */
export function resolveGameHttpUrl(
  location: Pick<Location, 'origin'>,
  config?: Pick<PublicClientConfig, 'gameHttpUrl' | 'gameWsUrl'> | null,
): string {
  const explicit = config?.gameHttpUrl?.trim();
  if (explicit) {
    return explicit.replace(/\/+$/, '');
  }

  const wsUrl = config?.gameWsUrl?.trim();
  if (wsUrl) {
    const derived = deriveGameHttpUrlFromWsUrl(wsUrl);
    if (derived) return derived;
  }

  return location.origin.replace(/\/+$/, '');
}
