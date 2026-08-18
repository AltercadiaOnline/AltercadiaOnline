import { afterEach, describe, expect, it } from 'vitest';
import { createDefaultPlayerProgressionData } from '../../shared/progression/playerProgressionData.js';
import { emptyMarcosNodeProgression } from '../../shared/progression/marcoProgression.js';
import {
  getAuthoritativeProgression,
  loadAuthoritativeProgression,
  resetAuthoritativeProgressionStore,
} from './authoritativeProgressionStore.js';
import { reconcileAuthoritativeCharacterClassLink } from './reconcileCharacterClassLink.js';
import { resetWorldProfileStore } from '../world/worldProfileStore.js';

function loadProfile(
  classId?: 'IMPETUS' | 'COGITOR' | 'TUTATOR' | 'DISSOLUTUS',
): void {
  loadAuthoritativeProgression('player-a', 1, {
    progression: createDefaultPlayerProgressionData(),
    marcos: {
      activeMarcos: [],
      flowSpeedBase: 1,
      nodeProgression: emptyMarcosNodeProgression(),
    },
    characterProfile: {
      level: 1,
      xpCurrent: 0,
      ...(classId ? { classId } : {}),
    },
  });
}

describe('reconcileAuthoritativeCharacterClassLink', () => {
  afterEach(() => {
    resetAuthoritativeProgressionStore();
    resetWorldProfileStore();
  });

  it('hub class vence leftover IMPETUS no save', () => {
    loadProfile('IMPETUS');
    expect(reconcileAuthoritativeCharacterClassLink('player-a', 1, 'COGITOR')).toBe('COGITOR');
    expect(getAuthoritativeProgression('player-a', 1).characterProfile.classId).toBe('COGITOR');
  });

  it('não grava IMPETUS quando a classe ainda é desconhecida', () => {
    loadProfile();
    expect(reconcileAuthoritativeCharacterClassLink('player-a', 1)).toBe('IMPETUS');
    expect(getAuthoritativeProgression('player-a', 1).characterProfile.classId).toBeUndefined();
  });
});
