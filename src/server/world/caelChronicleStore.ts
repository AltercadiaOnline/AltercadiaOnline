import {
  createEmptyCaelChronicleProgress,
  sanitizeCaelChronicleProgress,
  type CaelChronicleProgress,
} from '../../shared/world/caelChronicleBook.js';
import { markCharacterPersistenceDirty } from '../persistence/characterPersistenceDirty.js';

const records = new Map<string, CaelChronicleProgress>();

function profileKey(playerId: string, characterId: number): string {
  return `${playerId}:${characterId}`;
}

export function getCaelChronicleProgress(
  playerId: string,
  characterId: number,
): CaelChronicleProgress {
  const key = profileKey(playerId, characterId);
  const existing = records.get(key);
  if (existing) return existing;
  const created = createEmptyCaelChronicleProgress();
  records.set(key, created);
  return created;
}

export function setCaelChronicleProgress(
  playerId: string,
  characterId: number,
  progress: CaelChronicleProgress,
): CaelChronicleProgress {
  const next = sanitizeCaelChronicleProgress(progress);
  records.set(profileKey(playerId, characterId), next);
  markCharacterPersistenceDirty(playerId, characterId, 'progression');
  return next;
}

export function exportCaelChroniclePersistence(
  playerId: string,
  characterId: number,
): CaelChronicleProgress {
  return sanitizeCaelChronicleProgress(getCaelChronicleProgress(playerId, characterId));
}

export function hydrateCaelChroniclePersistence(
  playerId: string,
  characterId: number,
  slice: unknown,
): void {
  records.set(profileKey(playerId, characterId), sanitizeCaelChronicleProgress(slice));
}

export function clearCaelChronicleProgress(playerId: string, characterId: number): void {
  records.delete(profileKey(playerId, characterId));
}
