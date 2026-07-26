import { describe, expect, it } from 'vitest';
import {
  BASE_PLAYER_HP,
  computePlayerHpMax,
  PLAYER_HP_PER_LEVEL,
  resolvePlayerBaseHpForLevel,
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
});
