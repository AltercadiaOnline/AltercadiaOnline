import { describe, expect, it } from 'vitest';
import {
  LEVEL_MOVE_SPEED_MAX_BONUS,
  PLAYER_LEVEL_MAX,
  resolveLevelMoveSpeedMultiplier,
} from './levelMoveSpeed.js';

describe('resolveLevelMoveSpeedMultiplier', () => {
  it('nível 1 permanece na velocidade base', () => {
    expect(resolveLevelMoveSpeedMultiplier(1)).toBe(1);
    expect(resolveLevelMoveSpeedMultiplier(0)).toBe(1);
  });

  it('sobe de forma monotônica até o teto no nível 60', () => {
    let prev = resolveLevelMoveSpeedMultiplier(1);
    for (let level = 2; level <= PLAYER_LEVEL_MAX; level += 1) {
      const next = resolveLevelMoveSpeedMultiplier(level);
      expect(next).toBeGreaterThan(prev);
      prev = next;
    }
    expect(resolveLevelMoveSpeedMultiplier(60)).toBeCloseTo(1 + LEVEL_MOVE_SPEED_MAX_BONUS, 5);
    expect(resolveLevelMoveSpeedMultiplier(99)).toBe(resolveLevelMoveSpeedMultiplier(60));
  });

  it('ainda acelera do nível 30 ao 60 — não platôa no meio', () => {
    const l1 = resolveLevelMoveSpeedMultiplier(1);
    const l10 = resolveLevelMoveSpeedMultiplier(10);
    const l30 = resolveLevelMoveSpeedMultiplier(30);
    const l45 = resolveLevelMoveSpeedMultiplier(45);
    const l60 = resolveLevelMoveSpeedMultiplier(60);

    expect(l10 - l1).toBeGreaterThan(0.08);
    expect(l30).toBeGreaterThan(l10);
    expect(l60 - l30).toBeGreaterThan(0.12);
    expect(l60 - l45).toBeGreaterThan(0.04);
  });
});
