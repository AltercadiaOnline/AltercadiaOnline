import type { PetSnapshot } from '../shared/pet/petModel.js';
import {
  appendPetToRoster,
  createEmptyPetRoster,
  updatePetInRoster,
  type PlayerPetRosterSnapshot,
} from '../shared/pet/petRoster.js';

const rosters = new Map<string, PlayerPetRosterSnapshot>();

function profileKey(playerId: string, characterId: number): string {
  return `${playerId}:${characterId}`;
}

function cloneRoster(roster: PlayerPetRosterSnapshot): PlayerPetRosterSnapshot {
  return {
    pets: roster.pets.map((pet) => ({ ...pet })),
    activeSlotIndex: roster.activeSlotIndex,
    selectedSlotIndex: roster.selectedSlotIndex,
  };
}

export function getPetRosterSnapshot(
  playerId: string,
  characterId: number,
): PlayerPetRosterSnapshot {
  const key = profileKey(playerId, characterId);
  const existing = rosters.get(key);
  if (existing) return cloneRoster(existing);
  return createEmptyPetRoster();
}

export function adoptPetOnServer(
  playerId: string,
  characterId: number,
  pet: PetSnapshot,
): PlayerPetRosterSnapshot | null {
  const key = profileKey(playerId, characterId);
  const current = rosters.get(key) ?? createEmptyPetRoster();
  const next = appendPetToRoster(current, pet);
  if (!next) return null;
  rosters.set(key, next);
  return cloneRoster(next);
}

export function updatePetAtSlot(
  playerId: string,
  characterId: number,
  slotIndex: number,
  pet: PetSnapshot,
): PlayerPetRosterSnapshot | null {
  const key = profileKey(playerId, characterId);
  const current = rosters.get(key) ?? createEmptyPetRoster();
  const next = updatePetInRoster(current, slotIndex, pet);
  if (next === current) return null;
  rosters.set(key, next);
  return cloneRoster(next);
}

export function setPetRosterSnapshot(
  playerId: string,
  characterId: number,
  roster: PlayerPetRosterSnapshot,
): void {
  rosters.set(profileKey(playerId, characterId), {
    pets: roster.pets.map((pet) => ({ ...pet })),
    activeSlotIndex: roster.activeSlotIndex,
    selectedSlotIndex: roster.selectedSlotIndex,
  });
}

export function resetPetRosterStore(): void {
  rosters.clear();
}

export function exportPetRosterPersistence(
  playerId: string,
  characterId: number,
): PlayerPetRosterSnapshot {
  return getPetRosterSnapshot(playerId, characterId);
}

export function hydratePetRosterPersistence(
  playerId: string,
  characterId: number,
  roster: PlayerPetRosterSnapshot,
): void {
  setPetRosterSnapshot(playerId, characterId, roster);
}
