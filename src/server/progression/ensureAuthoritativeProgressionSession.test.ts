import { describe, expect, it, beforeEach } from 'vitest';
import {
  getAuthoritativeProgression,
  hasAuthoritativeProgressionEntry,
  loadAuthoritativeProgression,
  resetAuthoritativeProgressionStore,
} from './authoritativeProgressionStore.js';
import { ensureAuthoritativeProgressionSession } from './ensureAuthoritativeProgressionSession.js';
import { createDefaultPlayerProgressionData } from '../../shared/progression/playerProgressionData.js';
import { emptyMarcosNodeProgression } from '../../shared/progression/marcoProgression.js';

describe('ensureAuthoritativeProgressionSession', () => {
  beforeEach(() => {
    resetAuthoritativeProgressionStore();
  });

  it('reidrata nível do Supabase quando não há save em disco', () => {
    ensureAuthoritativeProgressionSession('player-a', 1, {
      hadPersistedSave: false,
      classId: 'COGITOR',
      displayName: 'Test',
      level: 5,
      xpCurrent: 12,
    });

    expect(hasAuthoritativeProgressionEntry('player-a', 1)).toBe(true);
    const progression = getAuthoritativeProgression('player-a', 1);
    expect(progression.characterProfile.level).toBe(5);
    expect(progression.characterProfile.xpCurrent).toBe(12);
    expect(progression.characterProfile.classId).toBe('COGITOR');
  });

  it('não sobrescreve save hidratado do disco', () => {
    loadAuthoritativeProgression('player-a', 2, {
      progression: createDefaultPlayerProgressionData(),
      marcos: {
        activeMarcos: [],
        flowSpeedBase: 1,
        nodeProgression: emptyMarcosNodeProgression(),
      },
      characterProfile: {
        level: 8,
        xpCurrent: 40,
        classId: 'IMPETUS',
        allocatedAtk: 3,
      },
    });

    ensureAuthoritativeProgressionSession('player-a', 2, {
      hadPersistedSave: true,
      level: 1,
      xpCurrent: 0,
    });

    const progression = getAuthoritativeProgression('player-a', 2);
    expect(progression.characterProfile.level).toBe(8);
    expect(progression.characterProfile.allocatedAtk).toBe(3);
  });
});
