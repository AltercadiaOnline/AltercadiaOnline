import { beforeEach, describe, expect, it } from 'vitest';
import {
  getWorldGameState,
  resetWorldGameState,
} from './WorldGameState.js';
import type { PlayerProfile } from '../models/playerProfile.js';

function profileAt(x: number, y: number): PlayerProfile {
  return {
    currentMapId: 'city_01',
    lastPosition: { x, y },
    facing: 'south',
  };
}

describe('WorldGameState.registerPlayer', () => {
  beforeEach(() => {
    resetWorldGameState();
  });

  it('substitui conexão órfã do mesmo personagem e reporta o id antigo', () => {
    const state = getWorldGameState();
    state.registerPlayer({
      connectionId: 'conn-old',
      playerId: 'user-a',
      characterId: 1,
      displayName: 'A',
      profile: profileAt(10, 20),
    });

    const next = state.registerPlayer({
      connectionId: 'conn-new',
      playerId: 'user-a',
      characterId: 1,
      displayName: 'A',
      profile: profileAt(30, 40),
    });

    expect(next.replacedConnectionIds).toEqual(['conn-old']);
    expect(state.getByConnection('conn-old')).toBeNull();
    expect(state.getByConnection('conn-new')?.x).toBe(30);
    expect(state.getByPlayer('user-a', 1)?.connectionId).toBe('conn-new');
    expect(state.listExploringOnMap('city_01')).toHaveLength(1);
  });

  it('ao trocar de personagem na mesma conexão, limpa o índice do char anterior', () => {
    const state = getWorldGameState();
    state.registerPlayer({
      connectionId: 'conn-1',
      playerId: 'user-a',
      characterId: 1,
      displayName: 'One',
      profile: profileAt(1, 1),
    });

    state.registerPlayer({
      connectionId: 'conn-1',
      playerId: 'user-a',
      characterId: 2,
      displayName: 'Two',
      profile: profileAt(2, 2),
    });

    expect(state.getByPlayer('user-a', 1)).toBeNull();
    expect(state.getByPlayer('user-a', 2)?.displayName).toBe('Two');
    expect(state.listExploringOnMap('city_01')).toHaveLength(1);
  });
});
