import type { AuthoritativePlayerSnapshot } from '../playerDataSnapshots.js';
import type { EconomyEvent } from '../economy/events.js';
import type { AuthoritativePositionDelta } from '../world/movementIntent.js';
import type { WorldCreatureSnapshot } from '../world/worldCreatureSync.js';
import type { RemotePlayerSnapshot } from '../world/remotePlayerSync.js';

export { WORLD_TICK_MS, WORLD_TICK_HZ } from '../world/worldGameLoopConfig.js';

export type SyncKind = 'full' | 'delta';

/** Cabeçalho comum a todo pacote SYNC autoritativo. */
export type SyncEnvelope = {
  readonly syncSeq: number;
  readonly serverTimeMs: number;
  readonly kind: SyncKind;
  /** FullState após reconnect — ignora cursor local. */
  readonly force?: boolean;
};

export type WorldTickDelta = {
  readonly tick: number;
  readonly serverTimeMs: number;
  /** Segundos no ciclo dia/noite [0, 1800) — SSOT do TimeManager. */
  readonly gameTime: number;
  readonly position?: AuthoritativePositionDelta;
  /** Criaturas ativas no mapa atual do jogador — coordenadas autoritativas do servidor. */
  readonly creatures?: readonly WorldCreatureSnapshot[];
  /** Jogadores próximos — futuro broadcast; cliente interpola sem predição local. */
  readonly nearbyPlayers?: readonly RemotePlayerSnapshot[];
};

export type StateSyncBody =
  | { readonly mode: 'full'; readonly snapshot: AuthoritativePlayerSnapshot }
  | { readonly mode: 'economy'; readonly event: EconomyEvent }
  | { readonly mode: 'tick'; readonly delta: WorldTickDelta };

export type StateSyncPayload = SyncEnvelope & {
  readonly body: StateSyncBody;
};

export type SyncCursor = {
  readonly syncSeq: number;
  readonly serverTimeMs: number;
};

export type SyncApplyDecision = 'apply' | 'discard_stale' | 'discard_duplicate';

/**
 * Descarta pacotes atrasados (time travel / lag) — SSOT monotônico por serverTimeMs + syncSeq.
 */
export function shouldApplySyncEnvelope(
  cursor: SyncCursor | null,
  incoming: SyncEnvelope,
): SyncApplyDecision {
  if (incoming.force === true) return 'apply';
  if (!cursor) return 'apply';

  if (incoming.serverTimeMs < cursor.serverTimeMs) return 'discard_stale';
  if (incoming.serverTimeMs === cursor.serverTimeMs && incoming.syncSeq < cursor.syncSeq) {
    return 'discard_stale';
  }
  if (incoming.serverTimeMs === cursor.serverTimeMs && incoming.syncSeq === cursor.syncSeq) {
    return 'discard_duplicate';
  }

  return 'apply';
}

export function isStateSyncPayload(value: unknown): value is StateSyncPayload {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  if (typeof record.syncSeq !== 'number' || !Number.isFinite(record.syncSeq)) return false;
  if (typeof record.serverTimeMs !== 'number' || !Number.isFinite(record.serverTimeMs)) return false;
  if (record.kind !== 'full' && record.kind !== 'delta') return false;
  const body = record.body;
  if (!body || typeof body !== 'object') return false;
  const mode = (body as Record<string, unknown>).mode;
  return mode === 'full' || mode === 'economy' || mode === 'tick';
}
