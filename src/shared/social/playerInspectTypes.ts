import type { ClassType } from '../types/classes.js';

export const INSPECT_PLAYER_ACTION = 'INSPECT_PLAYER' as const;

export type InspectPlayerPayload = {
  readonly targetPlayerId: string;
  readonly targetCharacterId: number;
  readonly screenX?: number;
  readonly screenY?: number;
};

/** Build sem SET — classe + pontos da ficha (servidor calcula). */
export type PlayerInspectBuild = {
  readonly atk: number;
  readonly def: number;
  readonly crit: number;
  readonly agil: number;
};

/** Placar PvP ranqueado (púlpito) — cliente só exibe. */
export type PlayerInspectPvpStats = {
  readonly rating: number;
  readonly wins: number;
  readonly losses: number;
  readonly matches: number;
};

export type PlayerInspectView = {
  readonly playerId: string;
  readonly characterId: number;
  readonly displayName: string;
  readonly level: number;
  readonly classId: ClassType;
  readonly online: boolean;
  readonly build: PlayerInspectBuild;
  readonly pvp: PlayerInspectPvpStats;
  readonly canAddFriend: boolean;
  readonly canInviteDuel: boolean;
  /** Motivo autoritativo quando `canInviteDuel` é false — UI só exibe. */
  readonly duelInviteBlockReason: string | null;
  readonly canTrade: boolean;
};

function isFiniteInt(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isClassId(value: unknown): value is ClassType {
  return value === 'IMPETUS'
    || value === 'COGITOR'
    || value === 'TUTATOR'
    || value === 'DISSOLUTUS';
}

function isInspectBuild(value: unknown): value is PlayerInspectBuild {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  return isFiniteInt(row.atk) && isFiniteInt(row.def) && isFiniteInt(row.crit) && isFiniteInt(row.agil);
}

function isInspectPvp(value: unknown): value is PlayerInspectPvpStats {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  return isFiniteInt(row.rating)
    && isFiniteInt(row.wins)
    && isFiniteInt(row.losses)
    && isFiniteInt(row.matches);
}

export function isPlayerInspectView(value: unknown): value is PlayerInspectView {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  if (typeof record.playerId !== 'string' || record.playerId.length === 0) return false;
  if (!isFiniteInt(record.characterId)) return false;
  if (typeof record.displayName !== 'string') return false;
  if (!isFiniteInt(record.level)) return false;
  if (!isClassId(record.classId)) return false;
  if (typeof record.online !== 'boolean') return false;
  if (!isInspectBuild(record.build)) return false;
  if (!isInspectPvp(record.pvp)) return false;
  if (typeof record.canAddFriend !== 'boolean') return false;
  if (typeof record.canInviteDuel !== 'boolean') return false;
  if (record.duelInviteBlockReason !== null && typeof record.duelInviteBlockReason !== 'string') {
    return false;
  }
  if (typeof record.canTrade !== 'boolean') return false;
  return true;
}
