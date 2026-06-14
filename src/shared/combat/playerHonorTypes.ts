import type { PlayerSkin } from '../character/playerSkin.js';
import { isPlayerSkinRecord } from '../character/playerSkin.js';

export type PlayerHonorMainHit = {
  readonly skillName: string;
  readonly hitCount: number;
  readonly totalDamage: number;
};

/** Snapshot segmentado do oponente — card de honra pós-duelo. */
export type PlayerHonorCardData = {
  readonly battleId: string;
  readonly opponentActorId: string;
  readonly opponentName: string;
  readonly opponentRankLabel: string;
  readonly damageDealt: number;
  readonly mainHits: readonly PlayerHonorMainHit[];
  readonly honorCount: number;
  readonly opponentSkin?: PlayerSkin;
};

export type PlayerHonorGivenPayload = {
  readonly battleId: string;
  readonly recipientActorId: string;
  readonly giverActorId: string;
  readonly characterId: number;
};

export type PlayerHonorResultPayload = {
  readonly ok: boolean;
  readonly battleId: string;
  readonly recipientActorId: string;
  readonly honorCount: number;
  readonly reason?: string;
};

export function isPlayerHonorGivenPayload(value: unknown): value is PlayerHonorGivenPayload {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.battleId === 'string'
    && typeof record.recipientActorId === 'string'
    && typeof record.giverActorId === 'string'
    && typeof record.characterId === 'number'
    && Number.isFinite(record.characterId)
  );
}

export function isPlayerHonorResultPayload(value: unknown): value is PlayerHonorResultPayload {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.ok === 'boolean'
    && typeof record.battleId === 'string'
    && typeof record.recipientActorId === 'string'
    && typeof record.honorCount === 'number'
    && Number.isFinite(record.honorCount)
  );
}

export function isPlayerHonorCardData(value: unknown): value is PlayerHonorCardData {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  if (
    typeof record.battleId !== 'string'
    || typeof record.opponentActorId !== 'string'
    || typeof record.opponentName !== 'string'
    || typeof record.opponentRankLabel !== 'string'
    || typeof record.damageDealt !== 'number'
    || typeof record.honorCount !== 'number'
    || !Array.isArray(record.mainHits)
  ) {
    return false;
  }
  if (record.opponentSkin !== undefined && !isPlayerSkinRecord(record.opponentSkin)) return false;
  return record.mainHits.every((hit) => {
    if (!hit || typeof hit !== 'object') return false;
    const row = hit as Record<string, unknown>;
    return (
      typeof row.skillName === 'string'
      && typeof row.hitCount === 'number'
      && typeof row.totalDamage === 'number'
    );
  });
}
