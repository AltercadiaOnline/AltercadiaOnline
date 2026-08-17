import { describe, expect, it } from 'vitest';
import { MoveEffectKind } from './classMovesetCatalog.js';
import {
  CRIT_BASE_BONUS,
  advanceCritCadence,
  isSignatureCriticalSkill,
  resolveCritHitMultiplier,
  resolveCritPityChance,
} from './critCadence.js';

describe('critCadence', () => {
  it('pity sobe a cada miss e garante no 5º após o respiro', () => {
    expect(resolveCritPityChance(0)).toBeCloseTo(0.18);
    expect(resolveCritPityChance(1)).toBeCloseTo(0.4);
    expect(resolveCritPityChance(4)).toBe(1);
  });

  it('não é metrônomo: roll alto falha o 1º; lockout impede dois seguidos; miss 4 garante', () => {
    const firstMiss = advanceCritCadence(null, { guaranteed: false, roll: 0.99 });
    expect(firstMiss.isCritical).toBe(false);

    const earlyCrit = advanceCritCadence(null, { guaranteed: false, roll: 0.01 });
    expect(earlyCrit.isCritical).toBe(true);

    const locked = advanceCritCadence(earlyCrit.state, { guaranteed: false, roll: 0 });
    expect(locked.isCritical).toBe(false);

    let state = firstMiss.state;
    for (let i = 0; i < 3; i += 1) {
      const next = advanceCritCadence(state, { guaranteed: false, roll: 0.99 });
      expect(next.isCritical).toBe(false);
      state = next.state;
    }
    const guaranteed = advanceCritCadence(state, { guaranteed: false, roll: 0.99 });
    expect(guaranteed.isCritical).toBe(true);
  });

  it('assinatura (Fúria) sempre estoura e aplica lockout', () => {
    expect(isSignatureCriticalSkill({ effectKind: MoveEffectKind.HighRiskBurst })).toBe(true);
    const burst = advanceCritCadence(null, { guaranteed: true, roll: 0.99 });
    expect(burst.isCritical).toBe(true);
    const after = advanceCritCadence(burst.state, { guaranteed: false, roll: 0 });
    expect(after.isCritical).toBe(false);
  });

  it('pico: 30 sem SET → 43; +28% SET → 51', () => {
    const naked = resolveCritHitMultiplier({ critChancePercent: 0 });
    expect(naked).toBeCloseTo(1 + CRIT_BASE_BONUS);
    expect(Math.floor(30 * naked)).toBe(43);

    const withSet = resolveCritHitMultiplier({ critChancePercent: 28 });
    expect(Math.floor(30 * withSet)).toBe(51);
  });
});
