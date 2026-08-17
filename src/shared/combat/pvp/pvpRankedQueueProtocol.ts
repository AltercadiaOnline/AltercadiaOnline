/**
 * Contrato WS da fila PvP ranqueada 1x1 (púlpito) — servidor autoritativo, cliente espelho.
 */

import type { PlayerSkinBundleId } from '../../character/playerSkinBundle.js';
import {
  PVP_RANKED_QUEUE_SLOT_COUNT,
  PVP_RANKED_STATION_ID,
  PVP_RANKED_STATION_LABEL,
} from './pvpRankedQueueConfig.js';

export type PvpRankedQueuePhase =
  | 'idle'
  | 'waiting'
  | 'countdown'
  | 'starting'
  | 'in_battle';

export type PvpRankedQueueSlotWire = {
  readonly playerId: string;
  readonly characterId: number;
  readonly displayName: string;
  readonly ready: boolean;
  readonly skinBundleId: PlayerSkinBundleId;
};

export type PvpRankedQueueSnapshot = {
  readonly stationId: string;
  readonly label: string;
  readonly phase: PvpRankedQueuePhase;
  readonly slots: readonly [PvpRankedQueueSlotWire | null, PvpRankedQueueSlotWire | null];
  readonly statusMessage: string;
  readonly countdownEndsAtMs: number | null;
  readonly exclusive: boolean;
  readonly matchId: string | null;
};

export type PvpRankedQueueErrorCode =
  | 'WORLD_LOGIN_REQUIRED'
  | 'STATION_FULL'
  | 'ALREADY_QUEUED'
  | 'NOT_IN_QUEUE'
  | 'EXCLUSIVE_LOCKED'
  | 'INVALID_STATION'
  | 'NOT_NEAR_STATION'
  | 'PLAYER_BUSY'
  | 'MATCH_START_FAILED';

export const PVP_RANKED_QUEUE_SLOT_COUNT_WIRE = PVP_RANKED_QUEUE_SLOT_COUNT;

export function createEmptyPvpRankedQueueSnapshot(
  stationId = PVP_RANKED_STATION_ID,
  label = PVP_RANKED_STATION_LABEL,
): PvpRankedQueueSnapshot {
  return {
    stationId,
    label,
    phase: 'idle',
    slots: [null, null],
    statusMessage: 'Aguardando oponente no púlpito…',
    countdownEndsAtMs: null,
    exclusive: false,
    matchId: null,
  };
}

export function isPvpRankedQueueSnapshot(value: unknown): value is PvpRankedQueueSnapshot {
  if (!value || typeof value !== 'object') return false;
  const r = value as Record<string, unknown>;
  if (typeof r.stationId !== 'string' || typeof r.label !== 'string') return false;
  if (typeof r.phase !== 'string' || typeof r.statusMessage !== 'string') return false;
  if (typeof r.exclusive !== 'boolean') return false;
  if (!(r.countdownEndsAtMs === null || typeof r.countdownEndsAtMs === 'number')) return false;
  if (!(r.matchId === null || typeof r.matchId === 'string')) return false;
  if (!Array.isArray(r.slots) || r.slots.length !== 2) return false;
  return true;
}
