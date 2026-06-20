import type { PublicClientConfig } from '../../shared/publicClientConfig.js';
import { resolveGameHttpUrl } from '../../shared/net/resolveGameHttpUrl.js';

const HEALTH_TIMEOUT_MS = 4000;

/** Verifica se o servidor de jogo (Railway) responde — não usa health da Vercel. */
export async function isGameServerReachable(
  config?: Pick<PublicClientConfig, 'gameHttpUrl' | 'gameWsUrl'> | null,
): Promise<boolean> {
  try {
    const base = resolveGameHttpUrl(window.location, config ?? null);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);
    const response = await fetch(`${base}/health`, {
      signal: controller.signal,
      credentials: 'omit',
    });
    clearTimeout(timeout);
    return response.ok;
  } catch {
    return false;
  }
}
