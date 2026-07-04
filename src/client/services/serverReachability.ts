import type { PublicClientConfig } from '../../shared/publicClientConfig.js';
import type { GameHttpUrlConfig } from '../../shared/net/resolveGameHttpUrl.js';
import {
  resolveAuthoritativeGameHttpUrl,
  resolveGameHttpUrl,
} from '../../shared/net/resolveGameHttpUrl.js';

const HEALTH_TIMEOUT_MS = 12_000;

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

async function fetchHealthOk(baseUrl: string): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);
  try {
    const response = await fetch(`${baseUrl.replace(/\/+$/, '')}/health`, {
      signal: controller.signal,
      credentials: 'omit',
    });
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

    if (body && typeof body === 'object' && (body as { ok?: unknown }).ok === true) {
      return true;
    }

    return false;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Verifica reachability do backend de jogo.
 * Split Vercel+Railway: front same-origin (/health stub) + Railway autoritativo (/health com serverId).
 */
export async function isGameServerReachable(
  config?: GameHttpUrlConfig | null,
): Promise<boolean> {
  try {
    const frontBase = resolveGameHttpUrl(window.location, config ?? null);
    const frontOk = await fetchHealthOk(frontBase);
    if (!frontOk) {
      if (isLocalDevHost(window.location.hostname)) {
        return true;
      }
      return hasConfiguredGameEndpoint(config);
    }

    const authoritative = resolveAuthoritativeGameHttpUrl(config);
    if (!authoritative) {
      return true;
    }

    const normalizedFront = frontBase.replace(/\/+$/, '');
    const normalizedAuthoritative = authoritative.replace(/\/+$/, '');
    if (normalizedFront === normalizedAuthoritative) {
      return true;
    }

    return fetchHealthOk(authoritative);
  } catch {
    return false;
  }
}
