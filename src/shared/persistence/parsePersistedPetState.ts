import { sanitizePetSnapshotFromClient } from '../pet/parsePetSnapshotInput.js';
import {
  clampPetSlotIndex,
  createEmptyPetRoster,
  MAX_PETS_PER_CHARACTER,
  type PlayerPetRosterSnapshot,
} from '../pet/petRoster.js';
import { emptyPersistedPetAffinity, type PersistedPetAffinitySlice } from './characterPersistenceRecord.js';

/** Parse JSONB / save de roster — descarta pets inválidos, limita ao máximo. */
export function parsePersistedPetRoster(raw: unknown): PlayerPetRosterSnapshot {
  if (!raw || typeof raw !== 'object') return createEmptyPetRoster();
  const record = raw as Record<string, unknown>;
  const petsRaw = Array.isArray(record.pets) ? record.pets : [];
  const pets = [];
  for (const entry of petsRaw) {
    const pet = sanitizePetSnapshotFromClient(entry);
    if (!pet) continue;
    pets.push(pet);
    if (pets.length >= MAX_PETS_PER_CHARACTER) break;
  }

  let selectedSlotIndex = clampPetSlotIndex(
    typeof record.selectedSlotIndex === 'number' ? record.selectedSlotIndex : 0,
  );
  if (pets.length > 0) {
    selectedSlotIndex = Math.min(selectedSlotIndex, pets.length - 1);
  } else {
    selectedSlotIndex = 0;
  }

  let activeSlotIndex: number | null = null;
  if (typeof record.activeSlotIndex === 'number' && Number.isFinite(record.activeSlotIndex)) {
    const clamped = clampPetSlotIndex(record.activeSlotIndex);
    if (pets[clamped]) activeSlotIndex = clamped;
  }

  return { pets, activeSlotIndex, selectedSlotIndex };
}

/** Parse JSONB / save de afinidade (rações + cooldowns). */
export function parsePersistedPetAffinity(raw: unknown): PersistedPetAffinitySlice {
  if (!raw || typeof raw !== 'object') {
    return emptyPersistedPetAffinity();
  }
  const record = raw as Record<string, unknown>;
  return {
    rationCharges: Math.max(
      0,
      Math.floor(typeof record.rationCharges === 'number' ? record.rationCharges : 0),
    ),
    lastPetRationFeedAtMs:
      typeof record.lastPetRationFeedAtMs === 'number' && Number.isFinite(record.lastPetRationFeedAtMs)
        ? record.lastPetRationFeedAtMs
        : null,
    lastPetAffectionAtMs:
      typeof record.lastPetAffectionAtMs === 'number' && Number.isFinite(record.lastPetAffectionAtMs)
        ? record.lastPetAffectionAtMs
        : null,
  };
}
