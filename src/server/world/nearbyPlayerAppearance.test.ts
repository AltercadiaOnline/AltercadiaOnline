import { afterEach, describe, expect, it } from 'vitest';
import { createDefaultPlayerProgressionData } from '../../shared/progression/playerProgressionData.js';
import { emptyMarcosNodeProgression } from '../../shared/progression/marcoProgression.js';
import { createPetSnapshot } from '../../shared/pet/petCatalog.js';
import {
  resetPetRosterStore,
  setPetRosterSnapshot,
} from '../../Economy/petRosterStore.js';
import {
  loadAuthoritativeProgression,
  resetAuthoritativeProgressionStore,
} from '../progression/authoritativeProgressionStore.js';
import { resolveNearbyPeerAppearance } from './nearbyPlayerAppearance.js';

describe('resolveNearbyPeerAppearance', () => {
  afterEach(() => {
    resetAuthoritativeProgressionStore();
    resetPetRosterStore();
  });

  it('lê skin, nível e pet do próprio peer', () => {
    loadAuthoritativeProgression('peer', 2, {
      progression: createDefaultPlayerProgressionData(),
      marcos: {
        activeMarcos: [],
        flowSpeedBase: 1,
        nodeProgression: emptyMarcosNodeProgression(),
      },
      characterProfile: {
        level: 14,
        xpCurrent: 40,
        skinBundleId: 'player_female_1',
      },
    });
    setPetRosterSnapshot('peer', 2, {
      pets: [
        createPetSnapshot('dimensional_cat', {
          name: 'Nimbus',
          colorId: 'violet',
          gender: 'female',
        }),
      ],
      activeSlotIndex: 0,
      selectedSlotIndex: 0,
    });

    expect(resolveNearbyPeerAppearance('peer', 2)).toEqual({
      skinBundleId: 'player_female_1',
      level: 14,
      companion: {
        name: 'Nimbus',
        kindId: 'dimensional_cat',
        colorId: 'violet',
        gender: 'female',
      },
    });
  });

  it('omite companheiro quando o pet está guardado', () => {
    loadAuthoritativeProgression('peer', 3, {
      progression: createDefaultPlayerProgressionData(),
      marcos: {
        activeMarcos: [],
        flowSpeedBase: 1,
        nodeProgression: emptyMarcosNodeProgression(),
      },
      characterProfile: {
        level: 4,
        xpCurrent: 0,
        skinBundleId: 'player_male_4',
      },
    });
    setPetRosterSnapshot('peer', 3, {
      pets: [createPetSnapshot('dimensional_dog', { name: 'Bolt' })],
      activeSlotIndex: null,
      selectedSlotIndex: 0,
    });

    expect(resolveNearbyPeerAppearance('peer', 3)).toEqual({
      skinBundleId: 'player_male_4',
      level: 4,
    });
  });
});
