import { afterEach, describe, expect, it } from 'vitest';
import { CITY_01_ID } from '../../shared/world/maps/city01.js';
import type { RemotePlayerSnapshot } from '../../shared/world/remotePlayerSync.js';
import {
  applyServerRemotePlayerSnapshots,
  clearRemoteEntitySyncBridge,
  collectRemotePlayersForRender,
  sampleRemoteEntitiesForRender,
} from './remoteEntitySyncBridge.js';

function peerAt(
  feetX: number,
  serverTimeMs: number,
): RemotePlayerSnapshot {
  return {
    playerId: 'peer-1',
    characterId: 2,
    displayName: 'Peer',
    skinBundleId: 'player_female_1',
    level: 9,
    companion: {
      name: 'Nimbus',
      kindId: 'dimensional_cat',
      colorId: 'violet',
      gender: 'female',
    },
    mapId: CITY_01_ID,
    feetX,
    feetY: 64,
    facing: 'east',
    serverTimeMs,
  };
}

describe('remoteEntitySyncBridge', () => {
  afterEach(() => {
    clearRemoteEntitySyncBridge();
  });

  it('interpola remotos no relógio do servidor, não em performance.now() cru', () => {
    applyServerRemotePlayerSnapshots(CITY_01_ID, [peerAt(0, 10_000)], 10_000, 0);
    applyServerRemotePlayerSnapshots(CITY_01_ID, [peerAt(100, 10_200)], 10_200, 200);

    const mid = sampleRemoteEntitiesForRender(CITY_01_ID, 250);
    expect(mid).toHaveLength(1);
    expect(mid[0]!.feetX).toBeCloseTo(75, 5);
    expect(mid[0]!.facing).toBe('east');
  });

  it('monta frames de overlay com nome, skin, nível e pet do peer', () => {
    applyServerRemotePlayerSnapshots(CITY_01_ID, [peerAt(0, 10_000)], 10_000, 0);
    applyServerRemotePlayerSnapshots(CITY_01_ID, [peerAt(100, 10_200)], 10_200, 200);

    const frames = collectRemotePlayersForRender(CITY_01_ID, 250);
    expect(frames).toHaveLength(1);
    expect(frames[0]!.playerId).toBe('peer-1');
    expect(frames[0]!.displayName).toBe('Peer');
    expect(frames[0]!.skinBundleId).toBe('player_female_1');
    expect(frames[0]!.level).toBe(9);
    expect(frames[0]!.companion).toEqual({
      name: 'Nimbus',
      kindId: 'dimensional_cat',
      colorId: 'violet',
      gender: 'female',
    });
    expect(frames[0]!.feetX).toBeCloseTo(75, 5);
    expect(frames[0]!.feetY).toBe(64);
  });
});
