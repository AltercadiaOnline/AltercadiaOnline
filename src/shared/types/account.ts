import type { ClassType } from './classes.js';

export interface AccountCharacter {
  readonly id: number;
  readonly name: string;
  readonly class: ClassType;
  readonly level: number;
}

export interface AccountProfile {
  readonly userId: string;
  readonly characters: readonly AccountCharacter[];
}

export function isAccountProfile(value: unknown): value is AccountProfile {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  if (typeof record.userId !== 'string') return false;
  if (!Array.isArray(record.characters)) return false;

  return record.characters.every((entry) => {
    if (!entry || typeof entry !== 'object') return false;
    const character = entry as Record<string, unknown>;
    const classId = character.class;
    return (
      typeof character.id === 'number'
      && typeof character.name === 'string'
      && typeof character.level === 'number'
      && typeof classId === 'string'
      && (classId === 'IMPETUS'
        || classId === 'COGITOR'
        || classId === 'TUTATOR'
        || classId === 'DISSOLUTUS')
    );
  });
}

export function getAccountCharacter(
  profile: AccountProfile,
  characterId: number,
): AccountCharacter | undefined {
  return profile.characters.find((character) => character.id === characterId);
}
