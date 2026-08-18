import {
  isStaticDistrictId,
  type StaticDistrictId,
} from './staticDistrictCatalog.js';

export const STATIC_HEAT = ['cold', 'hot', 'blackout'] as const;
export type StaticHeat = (typeof STATIC_HEAT)[number];

export const STATIC_FLEX_REACTION_KINDS = ['glitch', 'respect', 'static'] as const;
export type StaticFlexReactionKind = (typeof STATIC_FLEX_REACTION_KINDS)[number];

export const STATIC_WAR_ROOM_STATUSES = ['open', 'forming', 'locked', 'resolved', 'expired'] as const;
export type StaticWarRoomStatus = (typeof STATIC_WAR_ROOM_STATUSES)[number];

export const STATIC_NOT_LIVE_CODE = 'STATIC_NOT_LIVE' as const;

/** Fatia compacta para HUD / tick — sem ledger. */
export type StaticDistrictHudSlice = {
  readonly id: StaticDistrictId;
  readonly heat: StaticHeat;
  readonly sabotage: number;
  readonly goal: number;
  readonly blackoutRemainMs: number;
  readonly agentCount: number;
  readonly callId: string | null;
};

export type StaticNetworkHudSnapshot = {
  readonly revision: number;
  readonly districts: readonly StaticDistrictHudSlice[];
};

export type StaticApagaoPayload = {
  readonly districtId: StaticDistrictId;
  readonly untilMs: number;
  readonly xpMult: number;
  readonly dropMult: number;
};

export type StaticWarRoomCallPayload = {
  readonly callId: string;
  readonly districtId: StaticDistrictId;
  readonly hostName: string;
  readonly slots: number;
  readonly maxSlots: number;
  readonly expiresAtMs: number;
};

export type StaticWarRoomMemberSlice = {
  readonly characterId: number;
  readonly displayName: string;
  readonly slotIndex: number;
};

export type StaticWarRoomUpdatePayload = {
  readonly callId: string;
  readonly status: StaticWarRoomStatus;
  readonly members: readonly StaticWarRoomMemberSlice[];
};

export function isStaticHeat(value: unknown): value is StaticHeat {
  return value === 'cold' || value === 'hot' || value === 'blackout';
}

export function isStaticFlexReactionKind(value: unknown): value is StaticFlexReactionKind {
  return value === 'glitch' || value === 'respect' || value === 'static';
}

export function isStaticWarRoomStatus(value: unknown): value is StaticWarRoomStatus {
  return typeof value === 'string'
    && (STATIC_WAR_ROOM_STATUSES as readonly string[]).includes(value);
}

function isFiniteInt(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function isStaticDistrictHudSlice(value: unknown): value is StaticDistrictHudSlice {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  return isStaticDistrictId(row.id)
    && isStaticHeat(row.heat)
    && isFiniteInt(row.sabotage)
    && isFiniteInt(row.goal)
    && isFiniteInt(row.blackoutRemainMs)
    && isFiniteInt(row.agentCount)
    && (row.callId === null || typeof row.callId === 'string');
}

export function parseStaticNetworkHudSnapshot(raw: unknown): StaticNetworkHudSnapshot | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  if (!isFiniteInt(record.revision) || !Array.isArray(record.districts)) return null;
  const districts: StaticDistrictHudSlice[] = [];
  for (const row of record.districts) {
    if (!isStaticDistrictHudSlice(row)) return null;
    districts.push(row);
  }
  return { revision: record.revision, districts };
}

export function isStaticApagaoPayload(value: unknown): value is StaticApagaoPayload {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  return isStaticDistrictId(row.districtId)
    && isFiniteInt(row.untilMs)
    && isFiniteInt(row.xpMult)
    && isFiniteInt(row.dropMult);
}

export function isStaticWarRoomCallPayload(value: unknown): value is StaticWarRoomCallPayload {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  return typeof row.callId === 'string'
    && row.callId.length > 0
    && isStaticDistrictId(row.districtId)
    && typeof row.hostName === 'string'
    && isFiniteInt(row.slots)
    && isFiniteInt(row.maxSlots)
    && isFiniteInt(row.expiresAtMs);
}

export function isStaticWarRoomUpdatePayload(value: unknown): value is StaticWarRoomUpdatePayload {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  if (typeof row.callId !== 'string' || row.callId.length === 0) return false;
  if (!isStaticWarRoomStatus(row.status) || !Array.isArray(row.members)) return false;
  for (const member of row.members) {
    if (!member || typeof member !== 'object') return false;
    const m = member as Record<string, unknown>;
    if (!isFiniteInt(m.characterId) || typeof m.displayName !== 'string' || !isFiniteInt(m.slotIndex)) {
      return false;
    }
  }
  return true;
}
