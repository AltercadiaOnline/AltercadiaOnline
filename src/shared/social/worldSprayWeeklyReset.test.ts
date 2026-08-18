import { describe, expect, it } from 'vitest';
import { TacticalSprayService } from './tacticalSprayStore.js';
import {
  resolveLatestElapsedWorldSprayResetAtMs,
  resolveNextWorldSprayResetAtMs,
  shouldApplyWorldSprayWeeklyReset,
} from './worldSprayWeeklyReset.js';

describe('world spray weekly reset — segunda 07h BRT', () => {
  it('terça de madrugada aponta para a próxima segunda 07h', () => {
    // 2026-08-18 01:29 BRT = 04:29 UTC
    const now = Date.parse('2026-08-18T04:29:00.000Z');
    const next = resolveNextWorldSprayResetAtMs(now);
    expect(next).toBe(Date.parse('2026-08-24T10:00:00.000Z'));
  });

  it('segunda 06:59 BRT ainda espera o corte das 07h do mesmo dia', () => {
    const now = Date.parse('2026-08-24T09:59:00.000Z');
    expect(resolveNextWorldSprayResetAtMs(now)).toBe(Date.parse('2026-08-24T10:00:00.000Z'));
  });

  it('segunda 07h já passada agenda a semana seguinte', () => {
    const now = Date.parse('2026-08-24T10:00:00.000Z');
    expect(resolveNextWorldSprayResetAtMs(now)).toBe(Date.parse('2026-08-31T10:00:00.000Z'));
    expect(resolveLatestElapsedWorldSprayResetAtMs(now)).toBe(Date.parse('2026-08-24T10:00:00.000Z'));
  });

  it('primeiro boot não apaga o chão', () => {
    expect(shouldApplyWorldSprayWeeklyReset(Date.parse('2026-08-18T04:29:00.000Z'), null)).toBe(false);
  });

  it('servidor que dormiu no horário faz catch-up', () => {
    const now = Date.parse('2026-08-24T12:00:00.000Z');
    const lastRun = Date.parse('2026-08-17T10:00:00.000Z');
    expect(shouldApplyWorldSprayWeeklyReset(now, lastRun)).toBe(true);
  });
});

describe('tactical spray author wipe', () => {
  it('apaga só os pixos da ficha morta', () => {
    const sprays = new TacticalSprayService();
    sprays.placeSpray(
      {
        userId: 'user-a',
        authorCharacterId: 1,
        zoneId: 'city_01',
        posX: 4,
        posY: 4,
        sprayAssetId: 'spray_alerta_binario',
      },
      'Alpha',
    );
    sprays.placeSpray(
      {
        userId: 'user-a',
        authorCharacterId: 2,
        zoneId: 'city_01',
        posX: 12,
        posY: 12,
        sprayAssetId: 'spray_vigilante',
      },
      'Beta',
    );

    expect(sprays.removeSpraysForAuthor('user-a', 1)).toBe(1);
    expect(sprays.getSpraysInZone('city_01')).toHaveLength(1);
    expect(sprays.getSpraysInZone('city_01')[0]?.authorCharacterId).toBe(2);
  });
});
