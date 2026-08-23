import { describe, expect, it } from 'vitest';
import { DESIGN_CONFIG } from '../../config/designConstants.js';
import { tileCenterToWorldPixel } from './portals.js';
import { isPlayerInMonsterEncounterRange } from './creatureWanderConfig.js';

const TILE = DESIGN_CONFIG.TILE.SIZE;

describe('isPlayerInMonsterEncounterRange', () => {
  it('agente a 1 tile dispara encontro mesmo com player na borda do tile', () => {
    const monsterFeet = tileCenterToWorldPixel(10, 10, TILE);
    const playerOnFarEdge = {
      worldX: 11 * TILE + (TILE - 1),
      worldY: 10 * TILE + (TILE - 1),
    };
    expect(
      isPlayerInMonsterEncounterRange(
        playerOnFarEdge.worldX,
        playerOnFarEdge.worldY,
        {
          creatureId: 'vortex_agent',
          tileX: 10,
          tileY: 10,
          worldX: monsterFeet.x,
          worldY: monsterFeet.y,
        },
        TILE,
      ),
    ).toBe(true);
  });
});
