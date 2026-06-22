import {
  getDefaultOwnedSkinIds,
  type SkinSlotId,
} from '../shared/character/playerSkin.js';

export type OwnedSkinsRecord = Record<SkinSlotId, readonly string[]>;

const records = new Map<string, OwnedSkinsRecord>();

function profileKey(playerId: string, characterId: number): string {
  return `${playerId}:${characterId}`;
}

function cloneOwned(owned: OwnedSkinsRecord): OwnedSkinsRecord {
  return {
    hair: [...owned.hair],
    shirt: [...owned.shirt],
    pants: [...owned.pants],
    shoes: [...owned.shoes],
  };
}

export function getOwnedSkinsRecord(
  playerId: string,
  characterId: number,
): OwnedSkinsRecord {
  const key = profileKey(playerId, characterId);
  const existing = records.get(key);
  if (existing) return cloneOwned(existing);
  const created = cloneOwned(getDefaultOwnedSkinIds());
  records.set(key, created);
  return cloneOwned(created);
}

export function ownsSkinOption(
  playerId: string,
  characterId: number,
  slot: SkinSlotId,
  optionId: string,
): boolean {
  return getOwnedSkinsRecord(playerId, characterId)[slot].includes(optionId);
}

export function addOwnedSkinOption(
  playerId: string,
  characterId: number,
  slot: SkinSlotId,
  optionId: string,
): OwnedSkinsRecord {
  const key = profileKey(playerId, characterId);
  const current = records.get(key) ?? cloneOwned(getDefaultOwnedSkinIds());
  if (current[slot].includes(optionId)) {
    return cloneOwned(current);
  }
  const next = cloneOwned(current);
  next[slot] = [...next[slot], optionId];
  records.set(key, next);
  return cloneOwned(next);
}

export function setOwnedSkinsRecord(
  playerId: string,
  characterId: number,
  owned: OwnedSkinsRecord,
): void {
  records.set(profileKey(playerId, characterId), cloneOwned(owned));
}

export function resetSkinOwnershipStore(): void {
  records.clear();
}

export function exportOwnedSkinsPersistence(
  playerId: string,
  characterId: number,
): OwnedSkinsRecord {
  return getOwnedSkinsRecord(playerId, characterId);
}
