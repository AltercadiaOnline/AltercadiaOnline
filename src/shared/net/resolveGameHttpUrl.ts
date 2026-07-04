import type { PublicClientConfig } from '../publicClientConfig.js';
import { isLocalMonolithDevHost, resolveLocalMonolithGameHttpUrl } from './localMonolithDev.js';

export type GameHttpUrlConfig = Pick<PublicClientConfig, 'gameHttpUrl' | 'gameWsUrl'> & {
  readonly publicSiteUrl?: PublicClientConfig['publicSiteUrl'];
};

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

function normalizeOrigin(value: string): string {
  return value.replace(/\/+$/, '');
}

/** Host Railway / monólito — health, WS, deploy sync. */
export function resolveAuthoritativeGameHttpUrl(
  config?: GameHttpUrlConfig | null,
): string | null {
  const explicit = config?.gameHttpUrl?.trim();
  if (explicit) {
    return normalizeOrigin(explicit);
  }

  const wsUrl = config?.gameWsUrl?.trim();
  if (wsUrl) {
    return deriveGameHttpUrlFromWsUrl(wsUrl);
  }

  return null;
}

function isVercelSplitFrontend(
  location: Pick<Location, 'origin' | 'hostname'>,
  config?: GameHttpUrlConfig | null,
): boolean {
  const current = normalizeOrigin(location.origin);
  const publicSite = config?.publicSiteUrl?.trim();
  if (publicSite && normalizeOrigin(publicSite) === current) {
    return true;
  }
  return location.hostname === 'altercadia-online.vercel.app';
}

/**
 * Base HTTP para APIs do jogo (/api/character-hub, /api/player-snapshot, …).
 * Na Vercel oficial usa same-origin (/api/* serverless); Railway fica só para WS.
 */
export function resolveGameHttpUrl(
  location: Pick<Location, 'origin' | 'hostname'>,
  config?: GameHttpUrlConfig | null,
): string {
  if (isLocalMonolithDevHost(location.hostname)) {
    return resolveLocalMonolithGameHttpUrl(location);
  }

  if (isVercelSplitFrontend(location, config)) {
    return normalizeOrigin(location.origin);
  }

  const authoritative = resolveAuthoritativeGameHttpUrl(config);
  if (authoritative) {
    return authoritative;
  }

  return normalizeOrigin(location.origin);
}
