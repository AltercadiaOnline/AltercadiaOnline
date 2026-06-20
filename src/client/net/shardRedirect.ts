import type { PublicServerInstanceEntry } from '../../shared/world/serverListProtocol.js';
import { deriveGameHttpUrlFromWsUrl } from '../../shared/net/resolveGameHttpUrl.js';

/** Origin HTTP de um shard a partir da entrada de /api/servers. */
export function resolveShardGameOrigin(
  entry: Pick<PublicServerInstanceEntry, 'gameHttpUrl' | 'gameWsUrl'>,
): string | null {
  const explicit = entry.gameHttpUrl?.trim();
  if (explicit) {
    return explicit.replace(/\/+$/, '');
  }

  const wsUrl = entry.gameWsUrl?.trim();
  if (wsUrl) {
    return deriveGameHttpUrlFromWsUrl(wsUrl);
  }

  return null;
}

/**
 * Navega para o host do shard escolhido (outro Railway).
 * Preserva pathname, query OAuth e hash PKCE.
 */
export function redirectToShardOrigin(entry: PublicServerInstanceEntry): boolean {
  if (entry.isCurrentDeploy) return false;

  const origin = resolveShardGameOrigin(entry);
  if (!origin) {
    console.warn('[Net] Shard sem URL configurada:', entry.id);
    return false;
  }

  if (window.location.origin.replace(/\/+$/, '') === origin) {
    return false;
  }

  const target = `${origin}${window.location.pathname}${window.location.search}${window.location.hash}`;
  console.info('[Net] Redirecionando para shard', entry.id, '→', origin);
  window.location.replace(target);
  return true;
}
