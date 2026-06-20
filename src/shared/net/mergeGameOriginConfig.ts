import type { PublicClientConfig } from '../publicClientConfig.js';
import { deriveGameHttpUrlFromWsUrl } from './resolveGameHttpUrl.js';

export type GameOriginHints = {
  readonly gameWsUrl?: string | null;
  readonly gameHttpUrl?: string | null;
};

/** Preenche gameHttpUrl/gameWsUrl ausentes (ex.: /config/client sem env na Vercel). */
export function mergePublicClientConfigWithGameOrigin(
  config: PublicClientConfig,
  hints?: GameOriginHints | null,
): PublicClientConfig {
  if (!hints) return config;

  const gameWsUrl = config.gameWsUrl?.trim()
    || hints.gameWsUrl?.trim()
    || null;

  const explicitHttp = config.gameHttpUrl?.trim() || hints.gameHttpUrl?.trim() || null;
  const gameHttpUrl = explicitHttp
    || (gameWsUrl ? deriveGameHttpUrlFromWsUrl(gameWsUrl) : null);

  if (gameWsUrl === config.gameWsUrl && gameHttpUrl === config.gameHttpUrl) {
    return config;
  }

  return { ...config, gameWsUrl, gameHttpUrl };
}
