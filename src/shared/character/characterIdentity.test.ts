import { describe, expect, it } from 'vitest';
import { createDefaultPlayerSkin } from '../character/playerSkin.js';
import {
  characterIdentityFromHubSlot,
  parseHubClassId,
  resolveIdentityClassId,
} from './characterIdentity.js';
import type { AccountCharacter } from '../types/account.js';

function slot(overrides: Partial<AccountCharacter> = {}): AccountCharacter {
  return {
    id: 2,
    name: 'Nova',
    class: 'COGITOR',
    level: 1,
    slotIndex: 0,
    serverId: 'azul',
    skin: createDefaultPlayerSkin(),
    skinBundleId: 'player_male_1',
    ...overrides,
  };
}

describe('characterIdentity', () => {
  it('liga characterId → classe do hub sem fallback', () => {
    const identity = characterIdentityFromHubSlot(slot());
    expect(identity).not.toBeNull();
    expect(identity!.characterId).toBe(2);
    expect(identity!.classId).toBe('COGITOR');
    expect(resolveIdentityClassId(identity)).toBe('COGITOR');
    // Skin fica no hub/save como estado — não entra na identidade.
    expect(identity).not.toHaveProperty('skinBundleId');
  });

  it('rejeita slot sem nome', () => {
    expect(characterIdentityFromHubSlot(slot({ name: '   ' }))).toBeNull();
  });

  it('parseHubClassId ignora valor inválido e aceita classe do slot', () => {
    expect(parseHubClassId(undefined)).toBeNull();
    expect(parseHubClassId('IMPETUS')).toBe('IMPETUS');
    expect(parseHubClassId('COGITOR')).toBe('COGITOR');
  });
});
