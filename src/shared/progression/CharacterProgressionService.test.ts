import { describe, expect, it } from 'vitest';
import {
  CharacterProgressionService,
  resolveDomainRequiredXp,
} from './CharacterProgressionService.js';
import { getMoveMasteryCapLevel, canMoveGainXp, MOVE_MASTERY_CAP_FACTOR } from './moveMasteryCap.js';
import { totalMasteryXpForLevel } from './moveProgression.js';

describe('resolveDomainRequiredXp', () => {
  it('early levels are cheap (1→2 visível em poucas lutas zona 1)', () => {
    expect(resolveDomainRequiredXp(1)).toBe(14);
    expect(resolveDomainRequiredXp(1)).toBeLessThan(40);
    expect(resolveDomainRequiredXp(10)).toBeLessThan(50);
  });

  it('mid stays ahead of legacy 100×1.15^n through level 50', () => {
    for (const level of [20, 30, 40, 50]) {
      const legacy = Math.floor(100 * 1.15 ** (level - 1));
      expect(resolveDomainRequiredXp(level)).toBeLessThan(legacy);
    }
  });

  it('endgame wall is expensive (85+)', () => {
    expect(resolveDomainRequiredXp(85)).toBeGreaterThanOrEqual(20_000);
    expect(resolveDomainRequiredXp(90)).toBeGreaterThan(resolveDomainRequiredXp(85));
    expect(resolveDomainRequiredXp(98)).toBeGreaterThan(resolveDomainRequiredXp(90));
  });

  it('steps are positive through 98', () => {
    for (let level = 1; level <= 98; level += 1) {
      expect(resolveDomainRequiredXp(level)).toBeGreaterThan(0);
    }
  });

  it('getRequiredXp default matches piecewise; override keeps legacy formula', () => {
    expect(CharacterProgressionService.getRequiredXp(1)).toBe(resolveDomainRequiredXp(1));
    expect(CharacterProgressionService.getRequiredXp(50)).toBe(resolveDomainRequiredXp(50));
    expect(CharacterProgressionService.getRequiredXp(5, 50, 1.2)).toBe(Math.floor(50 * 1.2 ** 4));
  });
});

describe('MOVE_MASTERY_CAP_FACTOR 2.0 — âncoras de produto', () => {
  it('exposes factor 2', () => {
    expect(MOVE_MASTERY_CAP_FACTOR).toBe(2);
  });

  it('char 30 allows domain ~50 (moveset na frente)', () => {
    expect(canMoveGainXp(30, 50)).toBe(true);
    expect(getMoveMasteryCapLevel(30)).toBeGreaterThanOrEqual(50);
    expect(getMoveMasteryCapLevel(30)).toBe(60);
  });

  it('char 10 caps near 20', () => {
    expect(getMoveMasteryCapLevel(10)).toBe(20);
    expect(canMoveGainXp(10, 20)).toBe(false);
  });
});

describe('totalMasteryXpForLevel vs curva nova', () => {
  it('cumulativo até domínio 50 é bem menor que a curva antiga', () => {
    let legacy = 0;
    for (let level = 1; level < 50; level += 1) {
      legacy += Math.floor(100 * 1.15 ** (level - 1));
    }
    expect(totalMasteryXpForLevel(50)).toBeLessThan(legacy / 2);
    expect(totalMasteryXpForLevel(50)).toBe(5711);
  });
});
