import { resolveSessionAccessToken } from '../auth/supabaseAuth.js';
import { getClientRuntimeConfig } from '../runtime/clientRuntimeConfig.js';
import { resolveGameHttpUrl } from '../../shared/net/resolveGameHttpUrl.js';

export type GameServerFetchOptions = {
  readonly method?: string;
  readonly headers?: Record<string, string>;
  readonly body?: BodyInit | null;
  readonly signal?: AbortSignal;
  readonly searchParams?: Record<string, string>;
  /** Quando false, não envia Authorization (ex.: /health, /api/servers). */
  readonly auth?: boolean;
};

function resolveGameServerBaseUrl(): string {
  return resolveGameHttpUrl(window.location, getClientRuntimeConfig());
}

/** Monta URL absoluta para rota do servidor de jogo (Railway), não da Vercel. */
export function buildGameServerUrl(path: string, searchParams?: Record<string, string>): URL {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = new URL(normalizedPath, `${resolveGameServerBaseUrl()}/`);
  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      url.searchParams.set(key, value);
    }
  }
  return url;
}

/**
 * fetch autoritativo — JWT Supabase em Authorization (sem cookies Vercel).
 * Sessão persistida pelo supabase-js em localStorage.
 */
export async function gameServerFetch(
  path: string,
  options: GameServerFetchOptions = {},
): Promise<Response> {
  const url = buildGameServerUrl(path, options.searchParams);
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(options.headers ?? {}),
  };

  if (options.auth !== false) {
    const token = await resolveSessionAccessToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  const init: RequestInit = {
    method: options.method ?? 'GET',
    headers,
    credentials: 'omit',
  };
  if (options.body !== undefined) {
    init.body = options.body;
  }
  if (options.signal !== undefined) {
    init.signal = options.signal;
  }

  return fetch(url.toString(), init);
}
