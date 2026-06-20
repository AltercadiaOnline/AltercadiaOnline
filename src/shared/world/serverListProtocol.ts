import type { ShardPublicEndpoints } from './shardEndpoints.js';

/** Entrada pública de shard — exposta via GET /api/servers (catálogo autoritativo). */
export type PublicServerInstanceEntry = {
  readonly id: string;
  readonly displayName: string;
  readonly mapIds: readonly string[];
  /** true quando este shard é o SERVER_ID do processo que respondeu a API. */
  readonly isCurrentDeploy: boolean;
  /** Jogador pode selecionar (rollout — ex.: só Azul no lançamento). */
  readonly selectable: boolean;
  /** Host HTTP deste shard — redirect na char select quando ≠ deploy atual. */
  readonly gameHttpUrl: ShardPublicEndpoints['gameHttpUrl'];
  /** WebSocket deste shard — informativo / futuro roteamento direto. */
  readonly gameWsUrl: ShardPublicEndpoints['gameWsUrl'];
};

export type ServerListResponse = {
  readonly ok: true;
  readonly servers: readonly PublicServerInstanceEntry[];
  readonly defaultServerId: string;
};

export function isServerListResponse(value: unknown): value is ServerListResponse {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  if (record.ok !== true || !Array.isArray(record.servers)) return false;
  return record.servers.every((entry) => {
    if (!entry || typeof entry !== 'object') return false;
    const row = entry as Record<string, unknown>;
    const httpOk = row.gameHttpUrl === null || typeof row.gameHttpUrl === 'string';
    const wsOk = row.gameWsUrl === null || typeof row.gameWsUrl === 'string';
    return typeof row.id === 'string'
      && typeof row.displayName === 'string'
      && Array.isArray(row.mapIds)
      && typeof row.isCurrentDeploy === 'boolean'
      && typeof row.selectable === 'boolean'
      && httpOk
      && wsOk;
  });
}
