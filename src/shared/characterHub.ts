import { isPlayerSkinRecord } from './character/playerSkin.js';
import type { AccountCharacter } from './types/account.js';

export const CHARACTER_SLOT_COUNT = 5;

export type CharacterHubSlot = AccountCharacter | null;

export interface AccountCharacterHub {
  readonly userId: string;
  readonly slots: readonly CharacterHubSlot[];
}

export function createEmptyCharacterHub(userId: string): AccountCharacterHub {
  return {
    userId,
    slots: Array.from({ length: CHARACTER_SLOT_COUNT }, () => null),
  };
}

export function isAccountCharacterHub(value: unknown): value is AccountCharacterHub {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  if (typeof record.userId !== 'string') return false;
  if (!Array.isArray(record.slots) || record.slots.length !== CHARACTER_SLOT_COUNT) return false;

  return record.slots.every((slot) => {
    if (slot === null) return true;
    if (!slot || typeof slot !== 'object') return false;
    const character = slot as Record<string, unknown>;
    const classId = character.class;
    const hasValidSkin = character.skin === undefined || isPlayerSkinRecord(character.skin);
    return (
      typeof character.id === 'number'
      && typeof character.name === 'string'
      && typeof character.level === 'number'
      && typeof character.slotIndex === 'number'
      && typeof classId === 'string'
      && hasValidSkin
      && (classId === 'IMPETUS'
        || classId === 'COGITOR'
        || classId === 'TUTATOR'
        || classId === 'DISSOLUTUS')
    );
  });
}

export function listHubCharacters(hub: AccountCharacterHub): AccountCharacter[] {
  return hub.slots.filter((slot): slot is AccountCharacter => slot !== null);
}
