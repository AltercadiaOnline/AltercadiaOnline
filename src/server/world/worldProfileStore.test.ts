import { beforeEach, describe, expect, it } from 'vitest';
import {
  getWorldProfile,
  resetWorldProfileStore,
  saveWorldProfile,
} from './worldProfileStore.js';

describe('worldProfileStore sessionSync preserve', () => {
  beforeEach(() => {
    resetWorldProfileStore();
  });

  it('preserves activeMovesets when position save omits sessionSync', () => {
    const playerId = 'p1';
    const characterId = 1;
    const moves = ['imp_slash', 'imp_charge', 'imp_guard', 'imp_heal'];

    saveWorldProfile(playerId, characterId, {
      currentMapId: 'city_01',
      lastPosition: { x: 10, y: 20 },
      facing: 'south',
      sessionSync: { activeMovesets: moves },
    });

    saveWorldProfile(playerId, characterId, {
      currentMapId: 'city_01',
      lastPosition: { x: 42, y: 64 },
      facing: 'east',
    });

    const profile = getWorldProfile(playerId, characterId);
    expect(profile.lastPosition.x).toBe(42);
    expect(profile.facing).toBe('east');
    expect(profile.sessionSync?.activeMovesets).toEqual(moves);
  });

  it('allows explicit sessionSync overwrite', () => {
    const playerId = 'p2';
    const characterId = 1;

    saveWorldProfile(playerId, characterId, {
      currentMapId: 'city_01',
      lastPosition: { x: 0, y: 0 },
      facing: 'south',
      sessionSync: { activeMovesets: ['a', 'b', 'c', 'd'] },
    });

    saveWorldProfile(playerId, characterId, {
      currentMapId: 'city_01',
      lastPosition: { x: 0, y: 0 },
      facing: 'south',
      sessionSync: { activeMovesets: ['w', 'x', 'y', 'z'] },
    });

    const profile = getWorldProfile(playerId, characterId);
    expect(profile.sessionSync?.activeMovesets).toEqual(['w', 'x', 'y', 'z']);
  });

  it('preserves current constructFarmLayout when saving world profile', () => {
    const playerId = 'p3';
    const characterId = 1;

    saveWorldProfile(playerId, characterId, {
      currentMapId: 'farm_zone_01',
      lastPosition: { x: 10, y: 20 },
      facing: 'south',
      constructFarmLayout: 'zonabeco1a',
    });

    saveWorldProfile(playerId, characterId, {
      currentMapId: 'farm_zone_01',
      lastPosition: { x: 25, y: 30 },
      facing: 'east',
    });

    const profile = getWorldProfile(playerId, characterId);
    expect(profile.constructFarmLayout).toBe('zonabeco1a');
    expect(profile.currentMapId).toBe('farm_zone_01');
    expect(profile.facing).toBe('east');
  });
});
