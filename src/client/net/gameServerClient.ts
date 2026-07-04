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
  /** Aborta a requisição após N ms (evita UI presa se o Railway não responder). */
  readonly deadlineMs?: number;
};

const DEFAULT_GAME_SERVER_DEADLINE_MS = 20_000;

/** Teto para APIs da tela de personagem (hub, shards) — evita loading eterno. */
export const CHAR_SELECT_API_DEADLINE_MS = 5_000;

export function isGameServerFetchTimeoutError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

function mergeAbortSignals(
  primary: AbortSignal,
  secondary?: AbortSignal,
): AbortSignal {
  if (!secondary) return primary;
  if (secondary.aborted) return secondary;
  if (primary.aborted) return primary;

  const controller = new AbortController();
  const abort = (): void => controller.abort();

  primary.addEventListener('abort', abort, { once: true });
  secondary.addEventListener('abort', abort, { once: true });
  return controller.signal;
}

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
  const deadlineMs = options.deadlineMs ?? DEFAULT_GAME_SERVER_DEADLINE_MS;
  const deadlineController = new AbortController();
  const deadlineTimer = setTimeout(() => deadlineController.abort(), deadlineMs);
  const signal = mergeAbortSignals(deadlineController.signal, options.signal);

  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(options.headers ?? {}),
  };

  try {
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
      signal,
    };
    if (options.body !== undefined) {
      init.body = options.body;
    }

    return await fetch(url.toString(), init);
  } finally {
    clearTimeout(deadlineTimer);
  }
}
