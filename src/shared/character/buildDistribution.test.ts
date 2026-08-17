import { describe, expect, it } from 'vitest';
import {
  computeBuildDistribution,
  extractCombatOnlyBuildWeightsFromItemIds,
} from './buildDistribution.js';

describe('computeBuildDistribution', () => {
  it('soma 100% quando há pesos', () => {
    const dist = computeBuildDistribution({
      forca: 43,
      defesa: 25,
      critico: 20,
      agilidade: 12,
    });
    const sum = dist.shares.reduce((acc, row) => acc + row.percent, 0);
    expect(sum).toBe(100);
    expect(dist.hasSignal).toBe(true);
    expect(dist.shares.find((s) => s.id === 'ATK')?.percent).toBe(43);
    expect(dist.shares.find((s) => s.id === 'DEF')?.percent).toBe(25);
  });

  it('fica zerada sem bônus de SET', () => {
    const dist = computeBuildDistribution({
      forca: 0,
      defesa: 0,
      critico: 0,
      agilidade: 0,
    });
    expect(dist.hasSignal).toBe(false);
    expect(dist.shares.map((s) => s.percent)).toEqual([0, 0, 0, 0]);
  });

  it('arredonda com largest remainder', () => {
    const dist = computeBuildDistribution({
      forca: 1,
      defesa: 1,
      critico: 1,
      agilidade: 0,
    });
    const sum = dist.shares.reduce((acc, row) => acc + row.percent, 0);
    expect(sum).toBe(100);
    expect(dist.shares.find((s) => s.id === 'AGIL')?.percent).toBe(0);
  });

  it('soma CRIT combatOnly da Runa de Fúria na BUILD', () => {
    const extra = extractCombatOnlyBuildWeightsFromItemIds(['runa_furia']);
    expect(extra.CRIT).toBe(12);
    const dist = computeBuildDistribution(
      { forca: 0, defesa: 0, critico: 0, agilidade: 0 },
      extra,
    );
    expect(dist.hasSignal).toBe(true);
    expect(dist.shares.find((s) => s.id === 'CRIT')?.percent).toBe(100);
    expect(dist.shares.find((s) => s.id === 'CRIT')?.weight).toBe(12);
  });

  it('não duplica o passivo da Runa Volts Overclock (5 + 15 combatOnly)', () => {
    const extra = extractCombatOnlyBuildWeightsFromItemIds(['runa_volts_overclock']);
    expect(extra.CRIT).toBe(15);
    const dist = computeBuildDistribution(
      { forca: 0, defesa: 0, critico: 5, agilidade: 0 },
      extra,
    );
    expect(dist.shares.find((s) => s.id === 'CRIT')?.weight).toBe(20);
    expect(dist.shares.find((s) => s.id === 'CRIT')?.percent).toBe(100);
  });
});
