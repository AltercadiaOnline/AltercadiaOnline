import type { PetSnapshot } from './petModel.js';
import { setPetSummoned } from './petModel.js';

/** Máximo de companheiros dimensionais por personagem. */
export const MAX_PETS_PER_CHARACTER = 3;

export type PlayerPetRosterSnapshot = {
  readonly pets: readonly PetSnapshot[];
  /** Slot convocado no mundo/combate — `null` se todos guardados. */
  readonly activeSlotIndex: number | null;
  /** Slot selecionado na HUD Pet Love (0–2). */
  readonly selectedSlotIndex: number;
};

export function createEmptyPetRoster(): PlayerPetRosterSnapshot {
  return { pets: [], activeSlotIndex: null, selectedSlotIndex: 0 };
}

export function clampPetSlotIndex(index: number): number {
  return Math.min(MAX_PETS_PER_CHARACTER - 1, Math.max(0, Math.floor(index)));
}

export function canAdoptMorePets(roster: PlayerPetRosterSnapshot): boolean {
  return roster.pets.length < MAX_PETS_PER_CHARACTER;
}

export function rosterHasPetKind(
  roster: PlayerPetRosterSnapshot,
  kindId: PetSnapshot['kindId'],
): boolean {
  return roster.pets.some((pet) => pet.kindId === kindId);
}

/** Pet convocado (ACTIVE) — usado no mapa, combate e espelho da Ficha. */
export function resolveSummonedPet(roster: PlayerPetRosterSnapshot): PetSnapshot | null {
  if (roster.activeSlotIndex === null) return null;
  const pet = roster.pets[roster.activeSlotIndex];
  if (!pet || pet.status !== 'ACTIVE' || pet.hpCurrent <= 0) return null;
  return pet;
}

export function resolvePetAtSlot(
  roster: PlayerPetRosterSnapshot,
  slotIndex: number,
): PetSnapshot | null {
  const index = clampPetSlotIndex(slotIndex);
  return roster.pets[index] ?? null;
}

export function resolveSelectedPet(roster: PlayerPetRosterSnapshot): PetSnapshot | null {
  return resolvePetAtSlot(roster, roster.selectedSlotIndex);
}

/** Ativa um slot — demais ficam guardados (INACTIVE). */
export function activatePetSlot(
  roster: PlayerPetRosterSnapshot,
  slotIndex: number,
): PlayerPetRosterSnapshot {
  const index = clampPetSlotIndex(slotIndex);
  const target = roster.pets[index];
  if (!target || target.hpCurrent <= 0) return roster;

  const pets = roster.pets.map((pet, i) => {
    if (i === index) return setPetSummoned(pet, true);
    return setPetSummoned(pet, false);
  });

  return {
    pets,
    activeSlotIndex: index,
    selectedSlotIndex: index,
  };
}

/** Guarda todos os pets — nenhum convocado. */
export function deactivateAllPetSlots(roster: PlayerPetRosterSnapshot): PlayerPetRosterSnapshot {
  return {
    pets: roster.pets.map((pet) => setPetSummoned(pet, false)),
    activeSlotIndex: null,
    selectedSlotIndex: roster.selectedSlotIndex,
  };
}

export function selectPetSlot(
  roster: PlayerPetRosterSnapshot,
  slotIndex: number,
): PlayerPetRosterSnapshot {
  return { ...roster, selectedSlotIndex: clampPetSlotIndex(slotIndex) };
}

/** Troca só de aba na HUD — pets e convocação intactos. */
export function isRosterSelectionOnlyChange(
  before: PlayerPetRosterSnapshot,
  after: PlayerPetRosterSnapshot,
): boolean {
  if (before.selectedSlotIndex === after.selectedSlotIndex) return false;
  if (before.activeSlotIndex !== after.activeSlotIndex) return false;
  if (before.pets.length !== after.pets.length) return false;

  for (let i = 0; i < before.pets.length; i += 1) {
    const left = before.pets[i];
    const right = after.pets[i];
    if (left === right) continue;
    if (!left || !right) return false;
    if (left.instanceId !== right.instanceId) return false;
    if (left.affinityXp !== right.affinityXp) return false;
    if (left.hpCurrent !== right.hpCurrent) return false;
    if (left.status !== right.status) return false;
  }

  return true;
}

export function appendPetToRoster(
  roster: PlayerPetRosterSnapshot,
  pet: PetSnapshot,
): PlayerPetRosterSnapshot | null {
  if (!canAdoptMorePets(roster)) return null;

  const isFirst = roster.pets.length === 0;
  const nextPet = isFirst ? setPetSummoned(pet, true) : setPetSummoned(pet, false);
  const pets = [...roster.pets, nextPet];

  return {
    pets,
    activeSlotIndex: isFirst ? 0 : roster.activeSlotIndex,
    selectedSlotIndex: pets.length - 1,
  };
}

export function updatePetInRoster(
  roster: PlayerPetRosterSnapshot,
  slotIndex: number,
  pet: PetSnapshot,
): PlayerPetRosterSnapshot {
  const index = clampPetSlotIndex(slotIndex);
  if (!roster.pets[index]) return roster;

  const pets = roster.pets.map((entry, i) => (i === index ? { ...pet } : entry));
  let activeSlotIndex = roster.activeSlotIndex;

  if (activeSlotIndex === index && (pet.hpCurrent <= 0 || pet.status !== 'ACTIVE')) {
    activeSlotIndex = null;
  }

  return { ...roster, pets, activeSlotIndex };
}

/** Remove pet do roster (ex.: fim de vida natural) e reindexa slots ativos. */
export function removePetFromRoster(
  roster: PlayerPetRosterSnapshot,
  slotIndex: number,
): PlayerPetRosterSnapshot | null {
  const index = clampPetSlotIndex(slotIndex);
  if (!roster.pets[index]) return null;

  const pets = roster.pets.filter((_, i) => i !== index);
  if (pets.length === 0) {
    return { pets: [], activeSlotIndex: null, selectedSlotIndex: 0 };
  }

  let activeSlotIndex = roster.activeSlotIndex;
  if (activeSlotIndex === index) {
    activeSlotIndex = null;
  } else if (activeSlotIndex !== null && activeSlotIndex > index) {
    activeSlotIndex -= 1;
  }

  let selectedSlotIndex = roster.selectedSlotIndex;
  if (selectedSlotIndex >= pets.length) {
    selectedSlotIndex = pets.length - 1;
  } else if (selectedSlotIndex > index) {
    selectedSlotIndex -= 1;
  }
  selectedSlotIndex = clampPetSlotIndex(selectedSlotIndex);

  return { pets, activeSlotIndex, selectedSlotIndex };
}
