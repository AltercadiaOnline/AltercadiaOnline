import type { PlayerFacing } from './playerFacing.js';

/** Snapshot autoritativo de outro jogador no mapa — futuro campo `nearbyPlayers` no state-sync tick. */
export type RemotePlayerSnapshot = {
  readonly playerId: string;
  readonly characterId: number;
  readonly displayName?: string;
  readonly mapId: string;
  readonly feetX: number;
  readonly feetY: number;
  readonly facing: PlayerFacing;
  readonly serverTimeMs: number;
};

export function isValidRemotePlayerSnapshot(value: unknown): value is RemotePlayerSnapshot {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.playerId === 'string'
    && record.playerId.length > 0
    && typeof record.characterId === 'number'
    && Number.isFinite(record.characterId)
    && typeof record.mapId === 'string'
    && typeof record.feetX === 'number'
    && Number.isFinite(record.feetX)
    && typeof record.feetY === 'number'
    && Number.isFinite(record.feetY)
    && typeof record.facing === 'string'
    && typeof record.serverTimeMs === 'number'
    && Number.isFinite(record.serverTimeMs)
  );
}

export function parseRemotePlayerSnapshots(raw: unknown): RemotePlayerSnapshot[] | null {
  if (!Array.isArray(raw)) return null;
  const parsed: RemotePlayerSnapshot[] = [];
  for (const item of raw) {
    if (!isValidRemotePlayerSnapshot(item)) return null;
    parsed.push(item);
  }
  return parsed;
}
