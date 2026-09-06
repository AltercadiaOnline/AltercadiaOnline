import { describe, expect, it } from 'vitest';
import {
  BASE_PLAYER_HP,
  computePlayerHpMax,
  PLAYER_HP_PER_LEVEL,
  resolvePlayerBaseHpForLevel,
  resolveSurrenderWorldHpCurrent,
} from './playerVitals.js';

describe('playerVitals', () => {
  it('scales base HP with character level', () => {
    expect(resolvePlayerBaseHpForLevel(1)).toBe(BASE_PLAYER_HP);
    expect(resolvePlayerBaseHpForLevel(12)).toBe(BASE_PLAYER_HP + 11 * PLAYER_HP_PER_LEVEL);
    expect(computePlayerHpMax(12, 0)).toBe(210);
  });

  it('applies equipment HP percent on top of level base', () => {
    expect(computePlayerHpMax(12, 10)).toBe(231);
  });

  it('adds allocated Ficha HP to the base before percent', () => {
    expect(computePlayerHpMax(1, 0, 2)).toBe(116);
    expect(computePlayerHpMax(12, 10, 2)).toBe(Math.floor(226 * 1.1));
  });

  it('surrender world HP is half at moment, minimum 1', () => {
    expect(resolveSurrenderWorldHpCurrent(80, 100)).toBe(40);
    expect(resolveSurrenderWorldHpCurrent(1, 100)).toBe(1);
    expect(resolveSurrenderWorldHpCurrent(0, 100)).toBe(1);
    expect(resolveSurrenderWorldHpCurrent(3, 100)).toBe(1);
  });
});
