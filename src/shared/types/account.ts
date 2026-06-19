import { isPlayerSkinRecord } from '../character/playerSkin.js';
import type { ClassType } from './classes.js';
import type { PlayerSkin } from '../character/playerSkin.js';

export interface AccountCharacter {
  readonly id: number;
  readonly name: string;
  readonly class: ClassType;
  readonly level: number;
  readonly slotIndex: number;
  /** Shard onde o personagem foi criado — imutável. */
  readonly serverId: string;
  /** Aparência top-down — atualizada ao trocar skin no mundo. */
  readonly skin: PlayerSkin;
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
    const hasValidSkin = character.skin === undefined || isPlayerSkinRecord(character.skin);
    return (
      typeof character.id === 'number'
      && typeof character.name === 'string'
      && typeof character.level === 'number'
      && typeof character.slotIndex === 'number'
      && typeof character.serverId === 'string'
      && typeof classId === 'string'
      && hasValidSkin
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
