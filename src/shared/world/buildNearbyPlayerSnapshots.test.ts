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
});
