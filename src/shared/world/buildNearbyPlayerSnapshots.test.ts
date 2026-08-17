import { describe, expect, it } from 'vitest';
import { buildNearbyPlayerSnapshots } from './buildNearbyPlayerSnapshots.js';

describe('buildNearbyPlayerSnapshots', () => {
  it('monta RemotePlayerSnapshot com serverTimeMs do tick', () => {
    const snapshots = buildNearbyPlayerSnapshots([
      {
        playerId: 'player_a',
        characterId: 7,
        displayName: 'Ayla',
        mapId: 'city_01',
        feetX: 320,
        feetY: 480,
        facing: 'east',
      },
    ], 12_000);

    expect(snapshots).toHaveLength(1);
    expect(snapshots[0]).toEqual({
      playerId: 'player_a',
      characterId: 7,
      displayName: 'Ayla',
      mapId: 'city_01',
      feetX: 320,
      feetY: 480,
      facing: 'east',
      serverTimeMs: 12_000,
    });
  });

  it('espelha skin, nível e companheiro do peer, não do observador', () => {
    const snapshots = buildNearbyPlayerSnapshots([
      {
        playerId: 'player_b',
        characterId: 3,
        displayName: 'Breno',
        skinBundleId: 'player_female_1',
        level: 12,
        companion: {
          name: 'Nimbus',
          kindId: 'dimensional_cat',
          colorId: 'violet',
          gender: 'female',
        },
        mapId: 'city_01',
        feetX: 64,
        feetY: 96,
        facing: 'south',
      },
    ], 8_000);

    expect(snapshots[0]).toMatchObject({
      playerId: 'player_b',
      skinBundleId: 'player_female_1',
      level: 12,
      companion: {
        name: 'Nimbus',
        kindId: 'dimensional_cat',
        colorId: 'violet',
        gender: 'female',
      },
    });
  });
});
