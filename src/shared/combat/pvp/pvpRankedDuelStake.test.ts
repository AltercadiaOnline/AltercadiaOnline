import { describe, expect, it } from 'vitest';
import {
  isAllowedPvpRankedStakeVolts,
  parsePvpRankedStakeVolts,
} from './pvpRankedDuelStake.js';

describe('pvpRankedDuelStake', () => {
  it('aceita 0 e valores inteiros na faixa', () => {
    expect(isAllowedPvpRankedStakeVolts(0)).toBe(true);
    expect(isAllowedPvpRankedStakeVolts(50)).toBe(true);
    expect(isAllowedPvpRankedStakeVolts(25)).toBe(false);
    expect(parsePvpRankedStakeVolts(undefined)).toBe(0);
    expect(parsePvpRankedStakeVolts(100)).toBe(100);
    expect(parsePvpRankedStakeVolts(12)).toBeNull();
  });
});
