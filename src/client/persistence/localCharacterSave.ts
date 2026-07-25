import {
  CHARACTER_PERSISTENCE_SCHEMA_VERSION,
  createEmptyCharacterPersistenceRecord,
  isCharacterPersistenceRecord,
  type CharacterPersistenceRecord,
} from '../../shared/persistence/characterPersistenceRecord.js';
import { createEmptyPetRoster } from '../../shared/pet/petRoster.js';
import { isLocalGameMode } from '../runtime/gameMode.js';

const STORAGE_PREFIX = 'altercadia.localSave.v2:';

export function localCharacterSaveStorageKey(playerId: string, characterId: number): string {
  return `${STORAGE_PREFIX}${playerId}:${characterId}`;
}

export function loadLocalCharacterSave(
  playerId: string,
  characterId: number,
): CharacterPersistenceRecord | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(localCharacterSaveStorageKey(playerId, characterId));
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isCharacterPersistenceRecord(parsed)) return null;
    if (parsed.playerId !== playerId || parsed.characterId !== characterId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveLocalCharacterSave(record: CharacterPersistenceRecord): boolean {
  if (typeof localStorage === 'undefined') return false;
  if (!isLocalGameMode()) return false;
  try {
    const payload: CharacterPersistenceRecord = {
      ...record,
      schemaVersion: CHARACTER_PERSISTENCE_SCHEMA_VERSION,
      updatedAt: Date.now(),
    };
    localStorage.setItem(
      localCharacterSaveStorageKey(record.playerId, record.characterId),
      JSON.stringify(payload),
    );
    return true;
  } catch (error) {
    console.warn('[LocalSave] Falha ao gravar personagem local.', error);
    return false;
  }
}

export function clearLocalCharacterSave(playerId: string, characterId: number): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(localCharacterSaveStorageKey(playerId, characterId));
  } catch {
    /* ignore */
  }
}

/** Record vazio — personagem novo (sem itens/pets/moedas). */
export function createLocalEmptySave(
  playerId: string,
  characterId: number,
  options?: { readonly displayName?: string },
): CharacterPersistenceRecord {
  const base = createEmptyCharacterPersistenceRecord(playerId, characterId);
  return {
    ...base,
    characterProfile: {
      ...base.characterProfile,
      ...(options?.displayName ? { displayName: options.displayName } : {}),
    },
    petRoster: createEmptyPetRoster(),
    petAffinity: {
      rationCharges: 0,
      lastPetRationFeedAtMs: null,
      lastPetAffectionAtMs: null,
    },
  };
}

export function hasLocalCharacterSave(playerId: string, characterId: number): boolean {
  return loadLocalCharacterSave(playerId, characterId) !== null;
}
