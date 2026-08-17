import { describe, expect, it } from 'vitest';
import {
  BATTLE_ARENA_CONTACT_OFFSET_PX,
  battleStrikeSign,
  resolveBattleFoeDrawHeight,
  resolveBattleFoeHomeXs,
  sampleSmoothPose,
} from './battleArenaPose.js';
import { DESIGN_CONFIG } from '../../../config/designConstants.js';

describe('battleArenaPose', () => {
  it('player avança +, criatura avança −, e o recuo termina em 0', () => {
    expect(battleStrikeSign('ally') * BATTLE_ARENA_CONTACT_OFFSET_PX).toBe(22);
    expect(battleStrikeSign('foe') * BATTLE_ARENA_CONTACT_OFFSET_PX).toBe(-22);

    const mid = sampleSmoothPose(22, 0, 1000, 200, 1100);
    expect(mid.done).toBe(false);
    expect(mid.x).toBeGreaterThan(0);
    expect(mid.x).toBeLessThan(22);

    const end = sampleSmoothPose(22, 0, 1000, 200, 1200);
    expect(end.done).toBe(true);
    expect(end.x).toBe(0);
  });

  it('distribui 1, 2 e 3 inimigos à direita da arena', () => {
    const width = DESIGN_CONFIG.VIEWPORT.WIDTH;
    expect(resolveBattleFoeHomeXs(1)).toEqual([width * 0.78]);
    expect(resolveBattleFoeHomeXs(2)).toHaveLength(2);
    expect(resolveBattleFoeHomeXs(3)).toHaveLength(3);
    expect(resolveBattleFoeHomeXs(3)[0]!).toBeLessThan(resolveBattleFoeHomeXs(3)[2]!);
    expect(resolveBattleFoeDrawHeight(1)).toBeGreaterThan(resolveBattleFoeDrawHeight(3));
  });
});
