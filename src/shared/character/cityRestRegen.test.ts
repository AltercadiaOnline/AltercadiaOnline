import { describe, expect, it } from 'vitest';
import {
  applyCityRestRegen,
  CITY_REST_FULL_REF_MS,
  CITY_REST_FULL_REF_POINTS,
  CITY_REST_REGEN_PER_SEC,
  isCityRestRegenMap,
} from './cityRestRegen.js';

describe('cityRestRegen', () => {
  it('âncora: ~99 HP em 60s', () => {
    expect(CITY_REST_REGEN_PER_SEC).toBeCloseTo(CITY_REST_FULL_REF_POINTS / 60, 5);
    const result = applyCityRestRegen({
      vitals: { hpCurrent: 1, hpMax: 100, mpCurrent: 48, mpMax: 48 },
      elapsedMs: CITY_REST_FULL_REF_MS,
      active: true,
    });
    expect(result.vitals.hpCurrent).toBe(100);
    expect(result.changed).toBe(true);
  });

  it('teto maior demora mais (taxa flat)', () => {
    const halfMin = applyCityRestRegen({
      vitals: { hpCurrent: 0, hpMax: 200, mpCurrent: 0, mpMax: 48 },
      elapsedMs: CITY_REST_FULL_REF_MS,
      active: true,
    });
    expect(halfMin.vitals.hpCurrent).toBe(CITY_REST_FULL_REF_POINTS);
    expect(halfMin.vitals.hpCurrent).toBeLessThan(200);
  });

  it('regenera com HP 0', () => {
    const result = applyCityRestRegen({
      vitals: { hpCurrent: 0, hpMax: 100, mpCurrent: 0, mpMax: 48 },
      elapsedMs: 1000,
      active: true,
    });
    expect(result.vitals.hpCurrent).toBeGreaterThan(0);
    expect(result.vitals.mpCurrent).toBeGreaterThan(0);
  });

  it('pausa ao andando / fora — mantém carry e vitals', () => {
    const paused = applyCityRestRegen({
      vitals: { hpCurrent: 10, hpMax: 100, mpCurrent: 5, mpMax: 48 },
      elapsedMs: 5000,
      carry: { hpFrac: 0.8, mpFrac: 0.4 },
      active: false,
    });
    expect(paused.vitals.hpCurrent).toBe(10);
    expect(paused.carry.hpFrac).toBeCloseTo(0.8);
    expect(paused.changed).toBe(false);
  });

  it('acumula fração entre ticks curtos', () => {
    let carry = { hpFrac: 0, mpFrac: 0 };
    let hp = 50;
    for (let i = 0; i < 20; i += 1) {
      const step = applyCityRestRegen({
        vitals: { hpCurrent: hp, hpMax: 100, mpCurrent: 48, mpMax: 48 },
        elapsedMs: 100,
        carry,
        active: true,
      });
      hp = step.vitals.hpCurrent;
      carry = step.carry;
    }
    expect(hp).toBeGreaterThan(50);
  });

  it('só cidade city_01', () => {
    expect(isCityRestRegenMap('city_01')).toBe(true);
    expect(isCityRestRegenMap('farm_zone_01')).toBe(false);
  });
});
