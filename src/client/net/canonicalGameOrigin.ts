import type { PublicClientConfig } from '../../shared/publicClientConfig.js';
import { resolveGameHttpUrl } from '../../shared/net/resolveGameHttpUrl.js';

/** Origin HTTP do jogo (Railway) — OAuth e APIs usam este host, não a Vercel. */
export function resolveCanonicalGameOrigin(
  config: Pick<PublicClientConfig, 'gameHttpUrl' | 'gameWsUrl'>,
): string {
  return resolveGameHttpUrl(window.location, config);
}

export function isOnCanonicalGameOrigin(
  config: Pick<PublicClientConfig, 'gameHttpUrl' | 'gameWsUrl'>,
): boolean {
  const canonical = resolveCanonicalGameOrigin(config);
  return window.location.origin.replace(/\/+$/, '') === canonical;
}

/**
 * Redireciona jogador para o servidor de jogo (Railway) quando abriu link da Vercel.
 * Preserva ?code= OAuth e hash PKCE.
 */
export function redirectToCanonicalGameOriginIfNeeded(
  config: Pick<PublicClientConfig, 'gameHttpUrl' | 'gameWsUrl'>,
): boolean {
  if (isOnCanonicalGameOrigin(config)) return false;

  const canonical = resolveCanonicalGameOrigin(config);
  const target = `${canonical}${window.location.pathname}${window.location.search}${window.location.hash}`;
  console.info('[Net] Redirecionando para servidor de jogo:', canonical);
  window.location.replace(target);
  return true;
}
