/**
 * Runtime autoritativo da Torre de Poder (party run + unlock + clears).
 * Instância de andar = mesmo mapId + partyRunId (peers filtrados).
 */

import {
  TOWER_ENTRY_UNLOCK_MS,
  TOWER_MIN_LEVEL,
  TOWER_MVP_MAX_FLOOR,
  TOWER_PARTY_SIZE_MAX,
  TOWER_PARTY_SIZE_MIN,
  isTowerCheckpointFloor,
  towerXpBuffPercentForClearedFloors,
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
  spawnUnlocked: boolean;
  unlockExpiresAtServerMs: number | null;
  /** Andar atual da run (0 = ainda no gate). */
  floorIndex: number;
  floorCleared: boolean;
  /** Andares cujo boss já foi morto nesta run (para buff). */
  clearedFloors: number[];
  /** Quem já saiu por morte (não rejoin). */
  eliminatedPlayerIds: Set<string>;
  /** Instância lógica compartilhada nos andares. */
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

function charKey(playerId: string, characterId: number): string {
  return `${playerId}:${characterId}`;
}

function newId(prefix: string): string {
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

export function getTowerPlayerProgress(playerId: string, characterId: number): TowerPlayerProgress {
  const key = charKey(playerId, characterId);
  return (
    progressByCharacter.get(key) ?? {
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

export function buildTowerRunPublicState(party: TowerParty): TowerRunPublicState {
  return {
    towerId: 'default',
    partyRunId: party.partyRunId,
    floorIndex: party.floorIndex,
    spawnUnlocked: party.spawnUnlocked && (party.unlockExpiresAtServerMs ?? 0) > Date.now(),
    unlockExpiresAtServerMs: party.unlockExpiresAtServerMs,
    floorCleared: party.floorCleared,
    canEvacuate: isTowerCheckpointFloor(party.floorIndex) && party.floorCleared,
    memberIds: party.members.map((m) => m.playerId),
  };
}

export function createTowerParty(
  leaderPlayerId: string,
  leaderCharacterId: number,
  displayName: string,
  level: number,
): { ok: true; party: TowerParty } | { ok: false; error: string } {
  if (level < TOWER_MIN_LEVEL) return { ok: false, error: 'TOWER_LEVEL_TOO_LOW' };
  const existing = getTowerPartyForPlayer(leaderPlayerId);
  if (existing) return { ok: false, error: 'ALREADY_IN_PARTY' };

  const partyId = newId('tparty');
  const partyRunId = newId('trun');
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
    spawnUnlocked: false,
    unlockExpiresAtServerMs: null,
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
  if (party.spawnUnlocked) return { ok: false, error: 'ENTRY_ALREADY_UNLOCKED' };

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
  party.members = party.members.filter((m) => m.playerId !== playerId);
  const presence = getOrCreatePresence(playerId);
  presence.partyId = null;
  presence.partyRunId = null;
  presence.floorIndex = 0;
  if (party.members.length < TOWER_PARTY_SIZE_MIN) {
    parties.delete(party.partyId);
  } else if (party.leaderPlayerId === playerId) {
    party.leaderPlayerId = party.members[0]!.playerId;
  }
  return { ok: true };
}

export function unlockTowerEntry(
  leaderPlayerId: string,
): { ok: true; party: TowerParty } | { ok: false; error: string } {
  const party = getTowerPartyForPlayer(leaderPlayerId);
  if (!party) return { ok: false, error: 'NO_PARTY' };
  if (party.leaderPlayerId !== leaderPlayerId) return { ok: false, error: 'NOT_LEADER' };

  const members = party.members.length > 0 ? party.members : [];
  const hasPartyMembers = members.length >= TOWER_PARTY_SIZE_MIN;
  if (!hasPartyMembers) return { ok: false, error: 'NO_PARTY' };

  const allReady = members.every((m) => m.ready);
  if (party.members.length > 1 && !allReady) return { ok: false, error: 'NOT_ALL_READY' };

  party.spawnUnlocked = true;
  party.unlockExpiresAtServerMs = Date.now() + TOWER_ENTRY_UNLOCK_MS;
  return { ok: true, party };
}

export function canEnterTowerSpawn(playerId: string): { ok: true; party: TowerParty } | { ok: false; error: string } {
  const party = getTowerPartyForPlayer(playerId);
  if (!party) return { ok: false, error: 'NO_PARTY' };
  if (party.eliminatedPlayerIds.has(playerId)) return { ok: false, error: 'ELIMINATED' };
  if (!party.spawnUnlocked) return { ok: false, error: 'SPAWN_LOCKED' };
  if (!party.unlockExpiresAtServerMs || party.unlockExpiresAtServerMs < Date.now()) {
    return { ok: false, error: 'UNLOCK_EXPIRED' };
  }
  return { ok: true, party };
}

export function enterTowerFloor1(playerId: string): { ok: true; party: TowerParty; mapId: string } | { ok: false; error: string } {
  const gate = canEnterTowerSpawn(playerId);
  if (!gate.ok) return gate;
  const party = gate.party;
  if (party.floorIndex === 0) {
    party.floorIndex = 1;
    party.floorCleared = false;
  }
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
  if (!party.floorCleared) return { ok: false, error: 'FLOOR_NOT_CLEARED' };
  if (party.floorIndex >= TOWER_MVP_MAX_FLOOR) return { ok: false, error: 'MAX_FLOOR' };
  party.floorIndex += 1;
  party.floorCleared = false;
  const presence = getOrCreatePresence(playerId);
  presence.floorIndex = party.floorIndex;
  const mapId = resolveTowerMapIdForFloor(party.floorIndex);
  if (!mapId) return { ok: false, error: 'BAD_FLOOR' };
  return { ok: true, party, mapId };
}

export function eliminateTowerMember(playerId: string): {
  party: TowerParty | null;
  buff: TowerXpBuffState | null;
} {
  const party = getTowerPartyForPlayer(playerId);
  if (!party) return { party: null, buff: null };
  party.eliminatedPlayerIds.add(playerId);
  const member = party.members.find((m) => m.playerId === playerId);
  const buff = member
    ? applyTowerExitBuff(member.playerId, member.characterId, party.clearedFloors)
    : null;
  const presence = getOrCreatePresence(playerId);
  presence.floorIndex = 0;
  return { party, buff };
}

export function evacuateTowerCheckpoint(
  playerId: string,
): { ok: true; party: TowerParty; fameGain: number; buff: TowerXpBuffState } | { ok: false; error: string } {
  const party = getTowerPartyForPlayer(playerId);
  if (!party) return { ok: false, error: 'NO_PARTY' };
  if (party.eliminatedPlayerIds.has(playerId)) return { ok: false, error: 'ELIMINATED' };
  if (!isTowerCheckpointFloor(party.floorIndex) || !party.floorCleared) {
    return { ok: false, error: 'CANNOT_EVACUATE' };
  }
  const member = party.members.find((m) => m.playerId === playerId);
  if (!member) return { ok: false, error: 'NOT_MEMBER' };

  const fameGain = party.floorIndex * 10;
  setTowerFame(member.playerId, member.characterId, getTowerFame(member.playerId, member.characterId) + fameGain);
  const buff = applyTowerExitBuff(member.playerId, member.characterId, party.clearedFloors);

  party.members = party.members.filter((m) => m.playerId !== playerId);
  const presence = getOrCreatePresence(playerId);
  presence.partyId = null;
  presence.partyRunId = null;
  presence.floorIndex = 0;
  if (party.members.length === 0) {
    parties.delete(party.partyId);
  }
  return { ok: true, party, fameGain, buff };
}

function applyTowerExitBuff(
  playerId: string,
  characterId: number,
  clearedFloors: readonly number[],
): TowerXpBuffState {
  const key = charKey(playerId, characterId);
  const existing = getTowerXpBuff(playerId, characterId);
  const credited = new Set(existing?.creditedFloors ?? []);
  let added = 0;
  for (const f of clearedFloors) {
    if (!credited.has(f)) {
      credited.add(f);
      added += 1;
    }
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
