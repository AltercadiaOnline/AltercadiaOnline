import type { PublicClientConfig } from '../../shared/publicClientConfig.js';
import { resolveGameHttpUrl } from '../../shared/net/resolveGameHttpUrl.js';

const HEALTH_TIMEOUT_MS = 4000;

function isLocalDevHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

function hasConfiguredGameEndpoint(
  config?: Pick<PublicClientConfig, 'gameHttpUrl' | 'gameWsUrl'> | null,
): boolean {
  return Boolean(config?.gameHttpUrl?.trim() || config?.gameWsUrl?.trim());
}

function isAuthoritativeGameHealth(body: unknown): boolean {
  if (!body || typeof body !== 'object') return false;
  return typeof (body as { serverId?: unknown }).serverId === 'string';
}

/** Verifica se o servidor de jogo (Railway) responde — não usa health stub da Vercel. */
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

    if (!response.ok) return false;

    let body: unknown = null;
    try {
      body = await response.json();
    } catch {
      body = null;
    }

    if (isAuthoritativeGameHealth(body)) {
      return true;
    }

    if (isLocalDevHost(window.location.hostname)) {
      return true;
    }

    return hasConfiguredGameEndpoint(config);
  } catch {
    return false;
  }
}
