import { describe, expect, it } from 'vitest';
import { ZoneId } from '../items/itemTypes.js';
import {
  clampMonsterLevelToZone,
  MONSTER_ELITE_ATK_MULTIPLIER,
  MONSTER_ELITE_HP_MULTIPLIER,
  MONSTER_ZONE_LEVEL_GROWTH,
  resolveMonsterStats,
} from './monsterZoneScaling.js';

describe('monsterZoneScaling', () => {
  it('nível mínimo da zona = base sem crescimento', () => {
    const stats = resolveMonsterStats(ZoneId.Zone1, 1, false);
    expect(stats.level).toBe(1);
    expect(stats.relativeLevel).toBe(0);
    expect(stats.maxHp).toBe(70);
    expect(stats.attack).toBe(12);
    expect(stats.debuffSlots).toBe(1);
  });

  it('cresce HP/Atk com (1.05)^nívelRelativo', () => {
    const stats = resolveMonsterStats(ZoneId.Zone1, 10, false);
    const expectedHp = Math.floor(70 * (1 + MONSTER_ZONE_LEVEL_GROWTH) ** 9);
    const expectedAtk = Math.floor(12 * (1 + MONSTER_ZONE_LEVEL_GROWTH) ** 9);
    expect(stats.maxHp).toBe(expectedHp);
    expect(stats.attack).toBe(expectedAtk);
  });

  it('clampa nível fora da faixa', () => {
    expect(clampMonsterLevelToZone(ZoneId.Zone1, 99)).toBe(10);
    expect(clampMonsterLevelToZone(ZoneId.Zone2, 1)).toBe(10);
    const stats = resolveMonsterStats(ZoneId.Zone2, 1, false);
    expect(stats.level).toBe(10);
    expect(stats.maxHp).toBe(120);
    expect(stats.attack).toBe(22);
  });

  it('elite multiplica HP 1.25 e Atk 1.20', () => {
    const base = resolveMonsterStats(ZoneId.Zone1, 1, false);
    const elite = resolveMonsterStats(ZoneId.Zone1, 1, true);
    expect(elite.maxHp).toBe(Math.floor(base.maxHp * MONSTER_ELITE_HP_MULTIPLIER));
    expect(elite.attack).toBe(Math.floor(base.attack * MONSTER_ELITE_ATK_MULTIPLIER));
  });

  it('Z5 e Z3 usam bases da tabela', () => {
    expect(resolveMonsterStats(ZoneId.Zone3, 20, false)).toMatchObject({
      maxHp: 200,
      attack: 35,
      debuffSlots: 3,
    });
    expect(resolveMonsterStats(ZoneId.Zone5, 40, false)).toMatchObject({
      maxHp: 380,
      attack: 70,
      debuffSlots: 3,
    });
  });
});
