import { describe, expect, it } from 'vitest';
import { computeBuildDistribution } from './buildDistribution.js';

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
});
