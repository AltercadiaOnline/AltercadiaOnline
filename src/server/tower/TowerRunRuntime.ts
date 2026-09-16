/**
 * Runtime autoritativo da Torre de Poder.
 * - Várias parties no hall; 1 ocupação de andares por shard.
 * - 1º enter → janela 10s; cada um entra no spawn (sem auto-pull).
 * - CD 5 min criar party ao sair; AFK 3 min → deport.
 */

import {
  TOWER_AFK_DEPORT_MS,
  TOWER_ENTRY_WINDOW_MS,
  TOWER_MIN_LEVEL,
  TOWER_MVP_MAX_FLOOR,
  TOWER_PARTY_CREATE_COOLDOWN_MS,
  TOWER_PARTY_SIZE_MAX,
  TOWER_PARTY_SIZE_MIN,
  isTowerCheckpointFloor,
  towerXpBuffPercentForClearedFloors,
  type TowerHudPublicSnapshot,
  type TowerLeaderboardRow,
  type TowerPlayerProgress,
  type TowerRunPublicState,
  type TowerXpBuffState,
} from '../../shared/tower/towerTypes.js';
import { resolveTowerMapIdForFloor } from '../../shared/tower/towerMapCatalog.js';

export type TowerPartyMember = {
  readonly playerId: string;
  readonly characterId: number;
  readonly displayName: string;
  ready: boolean;
};

export type TowerParty = {
  readonly partyId: string;
  leaderPlayerId: string;
  readonly createdAtMs: number;
  members: TowerPartyMember[];
  /** Quem já entrou nos andares nesta run. */
  membersInRun: Set<string>;
  entryWindowEndsAtServerMs: number | null;
  rosterLocked: boolean;
  /** Andar atual da run (0 = ainda no gate / run resetada). */
  floorIndex: number;
  floorCleared: boolean;
  clearedFloors: number[];
  eliminatedPlayerIds: Set<string>;
  readonly partyRunId: string;
};

export type TowerPresence = {
  partyId: string | null;
  partyRunId: string | null;
  floorIndex: number;
};

const parties = new Map<string, TowerParty>();
const presenceByPlayer = new Map<string, TowerPresence>();
const progressByCharacter = new Map<string, TowerPlayerProgress>();
const xpBuffByCharacter = new Map<string, TowerXpBuffState>();
const fameByCharacter = new Map<string, number>();
/** Quem entrou e saiu — bloqueia create até expires. */
const partyCreateCooldownUntil = new Map<string, number>();
/** Última atividade (move) nos andares — AFK deport. */
const lastActivityByPlayer = new Map<string, number>();
/** partyRunId que ocupa os andares (1 por shard). */
let occupyingPartyRunId: string | null = null;

function charKey(playerId: string, characterId: number): string {
  return `${playerId}:${characterId}`;
}

function makeId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function getOrCreatePresence(playerId: string): TowerPresence {
  let p = presenceByPlayer.get(playerId);
  if (!p) {
    p = { partyId: null, partyRunId: null, floorIndex: 0 };
    presenceByPlayer.set(playerId, p);
  }
  return p;
}

export function getTowerPresence(playerId: string): TowerPresence {
  return getOrCreatePresence(playerId);
}

export function getTowerParty(partyId: string): TowerParty | null {
  return parties.get(partyId) ?? null;
}

export function getTowerPartyForPlayer(playerId: string): TowerParty | null {
  const pid = getOrCreatePresence(playerId).partyId;
  return pid ? parties.get(pid) ?? null : null;
}

export function isTowerOccupiedByOtherParty(partyRunId: string | null): boolean {
  if (!occupyingPartyRunId) return false;
  if (!partyRunId) return true;
  return occupyingPartyRunId !== partyRunId;
}

export function getOccupyingPartyRunId(): string | null {
  return occupyingPartyRunId;
}

export function getPartyCreateCooldownEndsAt(
  playerId: string,
  characterId: number,
): number | null {
  const until = partyCreateCooldownUntil.get(charKey(playerId, characterId));
  if (!until || until <= Date.now()) {
    if (until) partyCreateCooldownUntil.delete(charKey(playerId, characterId));
    return null;
  }
  return until;
}

export function getTowerPlayerProgress(playerId: string, characterId: number): TowerPlayerProgress {
  return (
    progressByCharacter.get(charKey(playerId, characterId)) ?? {
      highestFloorCleared: 0,
      floorClearCounts: {},
    }
  );
}

export function hydrateTowerPlayerProgress(
  playerId: string,
  characterId: number,
  progress: TowerPlayerProgress | null | undefined,
): void {
  if (!progress) return;
  progressByCharacter.set(charKey(playerId, characterId), {
    highestFloorCleared: Math.max(0, progress.highestFloorCleared | 0),
    floorClearCounts: { ...progress.floorClearCounts },
  });
}

export function getTowerXpBuff(playerId: string, characterId: number): TowerXpBuffState | null {
  const buff = xpBuffByCharacter.get(charKey(playerId, characterId));
  if (!buff) return null;
  if (buff.expiresAtServerMs <= Date.now()) {
    xpBuffByCharacter.delete(charKey(playerId, characterId));
    return null;
  }
  return buff;
}

export function getTowerFame(playerId: string, characterId: number): number {
  return fameByCharacter.get(charKey(playerId, characterId)) ?? 0;
}

export function setTowerFame(playerId: string, characterId: number, fame: number): void {
  fameByCharacter.set(charKey(playerId, characterId), Math.max(0, Math.floor(fame)));
}

export function hydrateTowerFame(
  playerId: string,
  characterId: number,
  fame: number | null | undefined,
): void {
  if (fame == null || !Number.isFinite(fame)) return;
  setTowerFame(playerId, characterId, fame);
}

export function hydrateTowerXpBuff(
  playerId: string,
  characterId: number,
  buff: TowerXpBuffState | null | undefined,
): void {
  if (!buff) return;
  xpBuffByCharacter.set(charKey(playerId, characterId), {
    percent: Math.max(0, buff.percent | 0),
    expiresAtServerMs: buff.expiresAtServerMs,
    creditedFloors: [...buff.creditedFloors],
  });
}

export function buildTowerLeaderboard(limit = 10): readonly TowerLeaderboardRow[] {
  const rows: TowerLeaderboardRow[] = [];
  for (const [key, progress] of progressByCharacter) {
    const [, characterIdRaw] = key.split(':');
    const characterId = Number(characterIdRaw);
    const highest = progress.highestFloorCleared;
    const wins = progress.floorClearCounts[String(highest)] ?? 0;
    rows.push({
      characterId: String(characterId),
      displayName: `Char#${characterId}`,
      highestFloorCleared: highest,
      winsAtHighestFloor: wins,
    });
  }
  rows.sort((a, b) => {
    if (b.highestFloorCleared !== a.highestFloorCleared) {
      return b.highestFloorCleared - a.highestFloorCleared;
    }
    return b.winsAtHighestFloor - a.winsAtHighestFloor;
  });
  return rows.slice(0, limit);
}

function sealEntryWindowIfNeeded(party: TowerParty, nowMs: number): void {
  if (party.rosterLocked) return;
  if (party.membersInRun.size === 0) return;

  const allIn = party.members.every(
    (m) => party.membersInRun.has(m.playerId) || party.eliminatedPlayerIds.has(m.playerId),
  );
  const windowExpired =
    party.entryWindowEndsAtServerMs != null && party.entryWindowEndsAtServerMs <= nowMs;

  if (allIn || windowExpired) {
    party.rosterLocked = true;
    party.entryWindowEndsAtServerMs = null;
  }
}

export function buildTowerRunPublicState(party: TowerParty): TowerRunPublicState {
  const now = Date.now();
  sealEntryWindowIfNeeded(party, now);
  const windowOpen =
    !party.rosterLocked
    && party.entryWindowEndsAtServerMs != null
    && party.entryWindowEndsAtServerMs > now;
  const inProgress = party.membersInRun.size > 0 || party.floorIndex > 0;
  return {
    towerId: 'default',
    partyRunId: party.partyRunId,
    floorIndex: party.floorIndex,
    spawnUnlocked: windowOpen || (inProgress && !party.rosterLocked),
    unlockExpiresAtServerMs: party.entryWindowEndsAtServerMs,
    entryWindowEndsAtServerMs: party.entryWindowEndsAtServerMs,
    membersInRun: [...party.membersInRun],
    rosterLocked: party.rosterLocked,
    floorCleared: party.floorCleared,
    canEvacuate: isTowerCheckpointFloor(party.floorIndex) && party.floorCleared,
    memberIds: party.members.map((m) => m.playerId),
  };
}

export function buildTowerHudSnapshot(
  playerId: string,
  characterId: number,
): TowerHudPublicSnapshot {
  const party = getTowerPartyForPlayer(playerId);
  const run = party ? buildTowerRunPublicState(party) : null;
  return {
    party: party
      ? {
          partyId: party.partyId,
          leaderPlayerId: party.leaderPlayerId,
          members: party.members.map((m) => ({
            playerId: m.playerId,
            characterId: m.characterId,
            displayName: m.displayName,
            ready: m.ready,
            inRun: party.membersInRun.has(m.playerId),
          })),
          run,
        }
      : null,
    progress: getTowerPlayerProgress(playerId, characterId),
    fame: getTowerFame(playerId, characterId),
    xpBuff: getTowerXpBuff(playerId, characterId),
    leaderboard: buildTowerLeaderboard(10),
    towerBusy: isTowerOccupiedByOtherParty(party?.partyRunId ?? null),
    partyCreateCooldownEndsAtServerMs: getPartyCreateCooldownEndsAt(playerId, characterId),
  };
}

export function createTowerParty(
  leaderPlayerId: string,
  leaderCharacterId: number,
  displayName: string,
  level: number,
): { ok: true; party: TowerParty } | { ok: false; error: string } {
  if (level < TOWER_MIN_LEVEL) return { ok: false, error: 'TOWER_LEVEL_TOO_LOW' };
  const cd = getPartyCreateCooldownEndsAt(leaderPlayerId, leaderCharacterId);
  if (cd) return { ok: false, error: 'PARTY_CREATE_COOLDOWN' };
  const existing = getTowerPartyForPlayer(leaderPlayerId);
  if (existing) return { ok: false, error: 'ALREADY_IN_PARTY' };

  const partyId = makeId('tparty');
  const partyRunId = makeId('trun');
  const party: TowerParty = {
    partyId,
    leaderPlayerId,
    createdAtMs: Date.now(),
    members: [
      {
        playerId: leaderPlayerId,
        characterId: leaderCharacterId,
        displayName,
        ready: true,
      },
    ],
    membersInRun: new Set(),
    entryWindowEndsAtServerMs: null,
    rosterLocked: false,
    floorIndex: 0,
    floorCleared: false,
    clearedFloors: [],
    eliminatedPlayerIds: new Set(),
    partyRunId,
  };
  parties.set(partyId, party);
  const presence = getOrCreatePresence(leaderPlayerId);
  presence.partyId = partyId;
  presence.partyRunId = partyRunId;
  presence.floorIndex = 0;
  return { ok: true, party };
}

export function inviteToTowerParty(
  leaderPlayerId: string,
  targetPlayerId: string,
  targetCharacterId: number,
  displayName: string,
  level: number,
): { ok: true; party: TowerParty } | { ok: false; error: string } {
  const party = getTowerPartyForPlayer(leaderPlayerId);
  if (!party) return { ok: false, error: 'NO_PARTY' };
  if (party.leaderPlayerId !== leaderPlayerId) return { ok: false, error: 'NOT_LEADER' };
  if (level < TOWER_MIN_LEVEL) return { ok: false, error: 'TOWER_LEVEL_TOO_LOW' };
  if (party.members.length >= TOWER_PARTY_SIZE_MAX) return { ok: false, error: 'PARTY_FULL' };
  if (party.members.some((m) => m.playerId === targetPlayerId)) {
    return { ok: false, error: 'ALREADY_MEMBER' };
  }
  if (getTowerPartyForPlayer(targetPlayerId)) return { ok: false, error: 'TARGET_IN_PARTY' };
  if (party.membersInRun.size > 0 || party.floorIndex > 0) {
    return { ok: false, error: 'RUN_IN_PROGRESS' };
  }

  party.members.push({
    playerId: targetPlayerId,
    characterId: targetCharacterId,
    displayName,
    ready: false,
  });
  const presence = getOrCreatePresence(targetPlayerId);
  presence.partyId = party.partyId;
  presence.partyRunId = party.partyRunId;
  presence.floorIndex = 0;
  return { ok: true, party };
}

export function setTowerPartyReady(
  playerId: string,
  ready: boolean,
): { ok: true; party: TowerParty } | { ok: false; error: string } {
  const party = getTowerPartyForPlayer(playerId);
  if (!party) return { ok: false, error: 'NO_PARTY' };
  const member = party.members.find((m) => m.playerId === playerId);
  if (!member) return { ok: false, error: 'NOT_MEMBER' };
  member.ready = ready;
  return { ok: true, party };
}

export function leaveTowerParty(playerId: string): { ok: true } | { ok: false; error: string } {
  const party = getTowerPartyForPlayer(playerId);
  if (!party) return { ok: false, error: 'NO_PARTY' };
  if (party.membersInRun.has(playerId)) {
    return { ok: false, error: 'IN_TOWER_RUN' };
  }
  party.members = party.members.filter((m) => m.playerId !== playerId);
  const presence = getOrCreatePresence(playerId);
  presence.partyId = null;
  presence.partyRunId = null;
  presence.floorIndex = 0;
  if (party.members.length < TOWER_PARTY_SIZE_MIN) {
    if (occupyingPartyRunId === party.partyRunId) occupyingPartyRunId = null;
    parties.delete(party.partyId);
  } else if (party.leaderPlayerId === playerId) {
    party.leaderPlayerId = party.members[0]!.playerId;
  }
  return { ok: true };
}

/**
 * @deprecated Entrada não usa mais Liberar. No-op compatível se party existir.
 */
export function unlockTowerEntry(
  leaderPlayerId: string,
): { ok: true; party: TowerParty } | { ok: false; error: string } {
  const party = getTowerPartyForPlayer(leaderPlayerId);
  if (!party) return { ok: false, error: 'NO_PARTY' };
  return { ok: true, party };
}

function applyPartyCreateCooldown(playerId: string, characterId: number): void {
  partyCreateCooldownUntil.set(
    charKey(playerId, characterId),
    Date.now() + TOWER_PARTY_CREATE_COOLDOWN_MS,
  );
}

function resetRunOccupancyIfEmpty(party: TowerParty): void {
  const stillInside = [...party.membersInRun].some(
    (id) => !party.eliminatedPlayerIds.has(id),
  );
  if (stillInside) return;

  if (occupyingPartyRunId === party.partyRunId) {
    occupyingPartyRunId = null;
  }
  party.membersInRun.clear();
  party.entryWindowEndsAtServerMs = null;
  party.rosterLocked = false;
  party.floorIndex = 0;
  party.floorCleared = false;
  party.clearedFloors = [];
  party.eliminatedPlayerIds.clear();
  for (const m of party.members) {
    lastActivityByPlayer.delete(m.playerId);
    const presence = getOrCreatePresence(m.playerId);
    if (presence.partyId === party.partyId) {
      presence.floorIndex = 0;
    }
  }
}

export function touchTowerActivity(playerId: string): void {
  const party = getTowerPartyForPlayer(playerId);
  if (!party?.membersInRun.has(playerId)) return;
  if (party.eliminatedPlayerIds.has(playerId)) return;
  lastActivityByPlayer.set(playerId, Date.now());
}

export function enterTowerFloor1(
  playerId: string,
): { ok: true; party: TowerParty; mapId: string } | { ok: false; error: string } {
  const party = getTowerPartyForPlayer(playerId);
  if (!party) return { ok: false, error: 'NO_PARTY' };
  if (party.eliminatedPlayerIds.has(playerId)) return { ok: false, error: 'ELIMINATED' };
  if (!party.members.some((m) => m.playerId === playerId)) {
    return { ok: false, error: 'NOT_MEMBER' };
  }

  const now = Date.now();
  sealEntryWindowIfNeeded(party, now);

  if (party.membersInRun.has(playerId)) {
    const mapId = resolveTowerMapIdForFloor(Math.max(1, party.floorIndex));
    if (!mapId) return { ok: false, error: 'BAD_FLOOR' };
    return { ok: true, party, mapId };
  }

  if (occupyingPartyRunId && occupyingPartyRunId !== party.partyRunId) {
    return { ok: false, error: 'TOWER_BUSY' };
  }

  if (party.rosterLocked) {
    return { ok: false, error: 'ROSTER_LOCKED' };
  }

  if (
    party.membersInRun.size > 0
    && party.entryWindowEndsAtServerMs != null
    && party.entryWindowEndsAtServerMs <= now
  ) {
    party.rosterLocked = true;
    party.entryWindowEndsAtServerMs = null;
    return { ok: false, error: 'ENTRY_WINDOW_EXPIRED' };
  }

  const isFirst = party.membersInRun.size === 0;
  if (isFirst) {
    occupyingPartyRunId = party.partyRunId;
    party.floorIndex = 1;
    party.floorCleared = false;
    if (party.members.length <= 1) {
      party.rosterLocked = true;
      party.entryWindowEndsAtServerMs = null;
    } else {
      party.rosterLocked = false;
      party.entryWindowEndsAtServerMs = now + TOWER_ENTRY_WINDOW_MS;
    }
  }

  party.membersInRun.add(playerId);
  lastActivityByPlayer.set(playerId, now);
  sealEntryWindowIfNeeded(party, now);

  const presence = getOrCreatePresence(playerId);
  presence.floorIndex = party.floorIndex;
  presence.partyRunId = party.partyRunId;
  const mapId = resolveTowerMapIdForFloor(party.floorIndex);
  if (!mapId) return { ok: false, error: 'BAD_FLOOR' };
  return { ok: true, party, mapId };
}

export function markTowerFloorCleared(
  partyRunId: string,
  floorIndex: number,
): TowerParty | null {
  const party = [...parties.values()].find((p) => p.partyRunId === partyRunId) ?? null;
  if (!party) return null;
  if (party.floorIndex !== floorIndex) return party;
  party.floorCleared = true;
  if (!party.clearedFloors.includes(floorIndex)) {
    party.clearedFloors.push(floorIndex);
  }
  for (const m of party.members) {
    if (!party.membersInRun.has(m.playerId)) continue;
    if (party.eliminatedPlayerIds.has(m.playerId)) continue;
    recordFloorClear(m.playerId, m.characterId, floorIndex);
  }
  return party;
}

function recordFloorClear(playerId: string, characterId: number, floorIndex: number): void {
  const key = charKey(playerId, characterId);
  const prev = getTowerPlayerProgress(playerId, characterId);
  const counts = { ...prev.floorClearCounts };
  const k = String(floorIndex);
  counts[k] = (counts[k] ?? 0) + 1;
  progressByCharacter.set(key, {
    highestFloorCleared: Math.max(prev.highestFloorCleared, floorIndex),
    floorClearCounts: counts,
  });
}

export function ascendTowerFloor(
  playerId: string,
): { ok: true; party: TowerParty; mapId: string } | { ok: false; error: string } {
  const party = getTowerPartyForPlayer(playerId);
  if (!party) return { ok: false, error: 'NO_PARTY' };
  if (party.eliminatedPlayerIds.has(playerId)) return { ok: false, error: 'ELIMINATED' };
  if (!party.membersInRun.has(playerId)) return { ok: false, error: 'NOT_IN_RUN' };
  if (!party.floorCleared) return { ok: false, error: 'FLOOR_NOT_CLEARED' };
  if (party.floorIndex >= TOWER_MVP_MAX_FLOOR) return { ok: false, error: 'MAX_FLOOR' };
  party.floorIndex += 1;
  party.floorCleared = false;
  const presence = getOrCreatePresence(playerId);
  presence.floorIndex = party.floorIndex;
  lastActivityByPlayer.set(playerId, Date.now());
  const mapId = resolveTowerMapIdForFloor(party.floorIndex);
  if (!mapId) return { ok: false, error: 'BAD_FLOOR' };
  return { ok: true, party, mapId };
}

function exitMemberFromRun(
  party: TowerParty,
  playerId: string,
): { member: TowerPartyMember | null; buff: TowerXpBuffState | null } {
  const member = party.members.find((m) => m.playerId === playerId) ?? null;
  party.membersInRun.delete(playerId);
  lastActivityByPlayer.delete(playerId);
  const presence = getOrCreatePresence(playerId);
  presence.floorIndex = 0;

  let buff: TowerXpBuffState | null = null;
  if (member) {
    applyPartyCreateCooldown(member.playerId, member.characterId);
    buff = applyTowerExitBuff(member.playerId, member.characterId, party.clearedFloors);
  }
  resetRunOccupancyIfEmpty(party);
  return { member, buff };
}

export function eliminateTowerMember(playerId: string): {
  party: TowerParty | null;
  buff: TowerXpBuffState | null;
} {
  const party = getTowerPartyForPlayer(playerId);
  if (!party) return { party: null, buff: null };
  party.eliminatedPlayerIds.add(playerId);
  const { buff } = exitMemberFromRun(party, playerId);
  return { party, buff };
}

export function evacuateTowerCheckpoint(
  playerId: string,
): { ok: true; party: TowerParty; fameGain: number; buff: TowerXpBuffState } | { ok: false; error: string } {
  const party = getTowerPartyForPlayer(playerId);
  if (!party) return { ok: false, error: 'NO_PARTY' };
  if (party.eliminatedPlayerIds.has(playerId)) return { ok: false, error: 'ELIMINATED' };
  if (!party.membersInRun.has(playerId)) return { ok: false, error: 'NOT_IN_RUN' };
  if (!isTowerCheckpointFloor(party.floorIndex) || !party.floorCleared) {
    return { ok: false, error: 'CANNOT_EVACUATE' };
  }
  const member = party.members.find((m) => m.playerId === playerId);
  if (!member) return { ok: false, error: 'NOT_MEMBER' };

  const fameGain = party.floorIndex * 10;
  setTowerFame(member.playerId, member.characterId, getTowerFame(member.playerId, member.characterId) + fameGain);

  const { buff } = exitMemberFromRun(party, playerId);
  party.members = party.members.filter((m) => m.playerId !== playerId);
  const presence = getOrCreatePresence(playerId);
  presence.partyId = null;
  presence.partyRunId = null;
  presence.floorIndex = 0;
  if (party.members.length === 0) {
    if (occupyingPartyRunId === party.partyRunId) occupyingPartyRunId = null;
    parties.delete(party.partyId);
  }

  return {
    ok: true,
    party,
    fameGain,
    buff: buff!,
  };
}

export type TowerAfkDeport = {
  readonly playerId: string;
  readonly characterId: number;
  readonly buff: TowerXpBuffState | null;
};

/** Deport AFK nos andares — chama no tick do mundo. */
export function tickTowerAfkDeports(nowMs = Date.now()): readonly TowerAfkDeport[] {
  const out: TowerAfkDeport[] = [];
  for (const party of parties.values()) {
    for (const playerId of [...party.membersInRun]) {
      if (party.eliminatedPlayerIds.has(playerId)) continue;
      const last = lastActivityByPlayer.get(playerId) ?? party.createdAtMs;
      if (nowMs - last < TOWER_AFK_DEPORT_MS) continue;
      const member = party.members.find((m) => m.playerId === playerId);
      if (!member) continue;
      party.eliminatedPlayerIds.add(playerId);
      const { buff } = exitMemberFromRun(party, playerId);
      out.push({ playerId, characterId: member.characterId, buff });
    }
  }
  return out;
}

function applyTowerExitBuff(
  playerId: string,
  characterId: number,
  clearedFloors: readonly number[],
): TowerXpBuffState {
  const key = charKey(playerId, characterId);
  const existing = getTowerXpBuff(playerId, characterId);
  const credited = new Set(existing?.creditedFloors ?? []);
  for (const f of clearedFloors) {
    if (!credited.has(f)) credited.add(f);
  }
  const percent = towerXpBuffPercentForClearedFloors(credited.size);
  const oneHour = 60 * 60 * 1000;
  const expiresAtServerMs =
    existing && existing.expiresAtServerMs > Date.now()
      ? existing.expiresAtServerMs
      : Date.now() + oneHour;
  const buff: TowerXpBuffState = {
    percent,
    expiresAtServerMs,
    creditedFloors: [...credited].sort((a, b) => a - b),
  };
  xpBuffByCharacter.set(key, buff);
  return buff;
}

/** Filtro AOI: andares da torre só veem a mesma partyRunId. */
export function filterTowerPeerVisible(
  observerPlayerId: string,
  peerPlayerId: string,
  observerMapId: string,
): boolean {
  if (!observerMapId.startsWith('tower_floor_')) return true;
  const a = getOrCreatePresence(observerPlayerId).partyRunId;
  const b = getOrCreatePresence(peerPlayerId).partyRunId;
  if (!a || !b) return false;
  return a === b;
}

/** Testes / reset de shard. */
export function __resetTowerRuntimeForTests(): void {
  parties.clear();
  presenceByPlayer.clear();
  progressByCharacter.clear();
  xpBuffByCharacter.clear();
  fameByCharacter.clear();
  partyCreateCooldownUntil.clear();
  lastActivityByPlayer.clear();
  occupyingPartyRunId = null;
}
