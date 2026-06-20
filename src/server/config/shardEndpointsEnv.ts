import { PLAYER_SHARD_ORDER } from '../../shared/world/serverInstanceCatalog.js';
import {
  EMPTY_SHARD_ENDPOINTS,
  type ShardPublicEndpoints,
} from '../../shared/world/shardEndpoints.js';
import {
  deriveGameHttpUrlFromWs,
  normalizeGameHttpUrl,
  normalizeGameWsUrl,
} from '../supabase/normalizeSupabaseUrl.js';

export type ShardEndpointsMap = Readonly<Record<string, ShardPublicEndpoints>>;

export type CurrentDeployEndpoints = {
  readonly serverId: string;
  readonly gameHttpUrl: string | null;
  readonly gameWsUrl: string | null;
};

function envKeyForShard(shardId: string, kind: 'HTTP' | 'WS'): string {
  const safe = shardId.toUpperCase().replace(/[^A-Z0-9]/g, '_');
  return kind === 'HTTP' ? `SHARD_${safe}_HTTP_URL` : `SHARD_${safe}_WS_URL`;
}

function normalizeShardEndpoints(
  httpRaw: string | undefined,
  wsRaw: string | undefined,
): ShardPublicEndpoints {
  const gameWsUrl = normalizeGameWsUrl(wsRaw);
  const gameHttpUrl =
    normalizeGameHttpUrl(httpRaw)
    ?? deriveGameHttpUrlFromWs(gameWsUrl);

  if (!gameHttpUrl && !gameWsUrl) {
    return EMPTY_SHARD_ENDPOINTS;
  }

  return { gameHttpUrl, gameWsUrl };
}

function parseShardEndpointsJson(raw: string | undefined): ShardEndpointsMap {
  const trimmed = raw?.trim();
  if (!trimmed) return {};

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed) as unknown;
  } catch {
    console.warn('[server] SHARD_ENDPOINTS inválido — JSON ignorado.');
    return {};
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    console.warn('[server] SHARD_ENDPOINTS deve ser um objeto JSON.');
    return {};
  }

  const map: Record<string, ShardPublicEndpoints> = {};
  for (const [shardId, value] of Object.entries(parsed as Record<string, unknown>)) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) continue;
    const row = value as Record<string, unknown>;
    const httpRaw = typeof row.gameHttpUrl === 'string'
      ? row.gameHttpUrl
      : typeof row.http === 'string'
        ? row.http
        : undefined;
    const wsRaw = typeof row.gameWsUrl === 'string'
      ? row.gameWsUrl
      : typeof row.ws === 'string'
        ? row.ws
        : undefined;
    map[shardId.trim().toLowerCase()] = normalizeShardEndpoints(httpRaw, wsRaw);
  }

  return map;
}

/**
 * Mapa shard → URLs públicas.
 * O deploy atual sempre usa GAME_HTTP_URL / GAME_WS_URL como fonte autoritativa.
 */
export function loadShardEndpointsFromEnv(
  env: NodeJS.ProcessEnv,
  currentDeploy: CurrentDeployEndpoints,
): ShardEndpointsMap {
  const merged: Record<string, ShardPublicEndpoints> = {
    ...parseShardEndpointsJson(env.SHARD_ENDPOINTS),
  };

  for (const shardId of PLAYER_SHARD_ORDER) {
    const fromEnv = normalizeShardEndpoints(
      env[envKeyForShard(shardId, 'HTTP')],
      env[envKeyForShard(shardId, 'WS')],
    );
    if (fromEnv.gameHttpUrl || fromEnv.gameWsUrl) {
      merged[shardId] = fromEnv;
    }
  }

  const deployId = currentDeploy.serverId.trim().toLowerCase();
  merged[deployId] = {
    gameHttpUrl: currentDeploy.gameHttpUrl,
    gameWsUrl: currentDeploy.gameWsUrl,
  };

  return merged;
}

export function resolveShardPublicEndpoints(
  map: ShardEndpointsMap,
  shardId: string,
): ShardPublicEndpoints {
  return map[shardId.trim().toLowerCase()] ?? EMPTY_SHARD_ENDPOINTS;
}
