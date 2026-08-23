import { describe, expect, it } from 'vitest';
import {
  resolvePvpConsolationXpPool,
  resolvePvpLevelGapNerfMultiplier,
  resolvePvpOpponentXpPool,
  resolvePvpWinnerXpPool,
} from './battlePvpXpPool.js';

describe('battlePvpXpPool', () => {
  it('pool = 15 + nívelOponente × 10', () => {
    expect(resolvePvpOpponentXpPool(1)).toBe(25);
    expect(resolvePvpOpponentXpPool(10)).toBe(115);
    expect(resolvePvpOpponentXpPool(30)).toBe(315);
  });

  it('nerf médio: Δ20 → ×0.5; underdog sem corte', () => {
    expect(resolvePvpLevelGapNerfMultiplier(30, 50)).toBe(1);
    expect(resolvePvpLevelGapNerfMultiplier(50, 30)).toBe(0.5);
    expect(resolvePvpLevelGapNerfMultiplier(70, 30)).toBe(0);
  });

  it('vencedor Nv.50 vs Nv.30: pool nerfado; consolação 40% desse valor', () => {
    const winnerPool = resolvePvpWinnerXpPool(50, 30);
    expect(winnerPool).toBe(Math.floor(315 * 0.5));
    expect(resolvePvpConsolationXpPool(winnerPool)).toBe(Math.floor(winnerPool * 0.4));
  });
});
