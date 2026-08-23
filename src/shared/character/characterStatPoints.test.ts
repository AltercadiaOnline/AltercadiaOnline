import { describe, expect, it } from 'vitest';
import {
  profileHasAllocatedStatFields,
  resolveUnspentStatPoints,
  STAT_POINTS_PER_LEVEL,
  tryAllocateStatPoints,
} from './characterStatPoints.js';

describe('characterStatPoints', () => {
  it('derives unspent from level and spent points', () => {
    expect(resolveUnspentStatPoints(1, { atk: 0, def: 0, hp: 0 })).toBe(0);
    expect(resolveUnspentStatPoints(10, { atk: 0, def: 0, hp: 0 })).toBe(9 * STAT_POINTS_PER_LEVEL);
    expect(resolveUnspentStatPoints(10, { atk: 4, def: 4, hp: 2 })).toBe(8);
  });

  it('allocates only when the bag has enough points', () => {
    const ok = tryAllocateStatPoints(5, { atk: 0, def: 0, hp: 0 }, { atk: 1, hp: 1 });
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(ok.allocated).toEqual({ atk: 1, def: 0, hp: 1 });
      expect(ok.view.unspent).toBe(6);
    }

    const fail = tryAllocateStatPoints(2, { atk: 2, def: 0, hp: 0 }, { def: 1 });
    expect(fail.ok).toBe(false);
  });

  it('detects when a profile snapshot actually carries allocated fields', () => {
    expect(profileHasAllocatedStatFields(undefined)).toBe(false);
    expect(profileHasAllocatedStatFields({})).toBe(false);
    expect(profileHasAllocatedStatFields({ allocatedAtk: 0 })).toBe(true);
  });
});
