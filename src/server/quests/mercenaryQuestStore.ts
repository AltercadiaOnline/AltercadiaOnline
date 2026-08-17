import {
  createEmptyMercenaryQuestProgress,
  sanitizeMercenaryQuestProgress,
} from '../../shared/quests/mercenaryQuestProgress.js';
import type { MercenaryQuestProgress } from '../../shared/quests/mercenaryQuestTypes.js';
import { markCharacterPersistenceDirty } from '../persistence/characterPersistenceDirty.js';

const records = new Map<string, MercenaryQuestProgress>();

function profileKey(playerId: string, characterId: number): string {
  return `${playerId}:${characterId}`;
}

export function getMercenaryQuestProgress(
  playerId: string,
  characterId: number,
): MercenaryQuestProgress {
  const key = profileKey(playerId, characterId);
  const existing = records.get(key);
  if (existing) return existing;
  const created = createEmptyMercenaryQuestProgress();
  records.set(key, created);
  return created;
}

export function setMercenaryQuestProgress(
  playerId: string,
  characterId: number,
  progress: MercenaryQuestProgress,
): MercenaryQuestProgress {
  const next = sanitizeMercenaryQuestProgress(progress);
  records.set(profileKey(playerId, characterId), next);
  markCharacterPersistenceDirty(playerId, characterId, 'progression');
  return next;
}

export function exportMercenaryQuestPersistence(
  playerId: string,
  characterId: number,
): MercenaryQuestProgress {
  return sanitizeMercenaryQuestProgress(getMercenaryQuestProgress(playerId, characterId));
}

export function hydrateMercenaryQuestPersistence(
  playerId: string,
  characterId: number,
  slice: unknown,
): void {
  records.set(profileKey(playerId, characterId), sanitizeMercenaryQuestProgress(slice));
}

export function clearMercenaryQuestProgress(playerId: string, characterId: number): void {
  records.delete(profileKey(playerId, characterId));
}
