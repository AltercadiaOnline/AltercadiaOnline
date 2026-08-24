import { describe, expect, it } from 'vitest';
import {
  computePvpRankedPotSettlement,
  isDraftPvpRankedStakeVolts,
  isLockablePvpRankedStakeVolts,
  parsePvpRankedLockStakeVolts,
  parsePvpRankedStakeVolts,
} from './pvpRankedDuelStake.js';

describe('pvpRankedDuelStake', () => {
  it('join aceita 0; lock só 50–10000', () => {
    expect(isDraftPvpRankedStakeVolts(0)).toBe(true);
    expect(isLockablePvpRankedStakeVolts(0)).toBe(false);
    expect(isLockablePvpRankedStakeVolts(50)).toBe(true);
    expect(isLockablePvpRankedStakeVolts(25)).toBe(false);
    expect(parsePvpRankedStakeVolts(undefined)).toBe(0);
    expect(parsePvpRankedLockStakeVolts(0)).toBeNull();
    expect(parsePvpRankedLockStakeVolts(100)).toBe(100);
  });

  it('5% da casa arredonda ao inteiro mais próximo', () => {
    expect(computePvpRankedPotSettlement(50, 1000)).toEqual({
      potVolts: 1050,
      rakeVolts: 53,
      payoutVolts: 997,
    });
    expect(computePvpRankedPotSettlement(50, 50)).toEqual({
      potVolts: 100,
      rakeVolts: 5,
      payoutVolts: 95,
    });
  });
});
