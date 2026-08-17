import { describe, expect, it } from 'vitest';
import { ZoneId } from '../items/itemTypes.js';
import {
  clampMonsterLevelToZone,
  MONSTER_ELITE_ATK_MULTIPLIER,
  MONSTER_ELITE_HP_MULTIPLIER,
  MONSTER_ZONE_LEVEL_GROWTH,
  resolveMonsterStats,
  resolveMonsterNativeLevel,
} from './monsterZoneScaling.js';

describe('monsterZoneScaling', () => {
  it('nível mínimo da zona = base sem crescimento', () => {
    const stats = resolveMonsterStats(ZoneId.Zone1, 1, false);
    expect(stats.level).toBe(1);
    expect(stats.relativeLevel).toBe(0);
    expect(stats.maxHp).toBe(55);
    expect(stats.attack).toBe(7);
    expect(stats.defense).toBe(3);
    expect(stats.debuffSlots).toBe(1);
  });

  it('cresce HP/Atk/Def com (1.05)^nívelRelativo', () => {
    const stats = resolveMonsterStats(ZoneId.Zone1, 10, false);
    const expectedHp = Math.floor(55 * (1 + MONSTER_ZONE_LEVEL_GROWTH) ** 9);
    const expectedAtk = Math.floor(7 * (1 + MONSTER_ZONE_LEVEL_GROWTH) ** 9);
    const expectedDef = Math.floor(3 * (1 + MONSTER_ZONE_LEVEL_GROWTH) ** 9);
    expect(stats.maxHp).toBe(expectedHp);
    expect(stats.attack).toBe(expectedAtk);
    expect(stats.defense).toBe(expectedDef);
  });

  it('clampa nível fora da faixa', () => {
    expect(clampMonsterLevelToZone(ZoneId.Zone1, 99)).toBe(10);
    expect(clampMonsterLevelToZone(ZoneId.Zone2, 1)).toBe(10);
    const stats = resolveMonsterStats(ZoneId.Zone2, 1, false);
    expect(stats.level).toBe(10);
    expect(stats.maxHp).toBe(120);
    expect(stats.attack).toBe(22);
    expect(stats.defense).toBe(10);
  });

  it('elite multiplica HP 1.25 e Atk 1.20', () => {
    const base = resolveMonsterStats(ZoneId.Zone1, 1, false);
    const elite = resolveMonsterStats(ZoneId.Zone1, 1, true);
    expect(elite.maxHp).toBe(Math.floor(base.maxHp * MONSTER_ELITE_HP_MULTIPLIER));
    expect(elite.attack).toBe(Math.floor(base.attack * MONSTER_ELITE_ATK_MULTIPLIER));
    expect(elite.defense).toBe(base.defense);
  });

  it('Z5 e Z3 usam bases da tabela', () => {
    expect(resolveMonsterStats(ZoneId.Zone3, 20, false)).toMatchObject({
      maxHp: 200,
      attack: 35,
      defense: 16,
      debuffSlots: 3,
    });
    expect(resolveMonsterStats(ZoneId.Zone5, 40, false)).toMatchObject({
      maxHp: 380,
      attack: 70,
      defense: 28,
      debuffSlots: 3,
    });
  });

  it('bicho lvl 40 tanka o mesmo golpe com DEF e HP — o hit do player não muda', () => {
    const rat = resolveMonsterStats(ZoneId.Zone1, 1, false);
    const beast = resolveMonsterStats(ZoneId.Zone4, 40, false);
    const playerStrike = 80;
    expect(rat.defense).toBeLessThan(beast.defense);
    expect(rat.maxHp).toBeLessThan(beast.maxHp);
    expect(Math.max(1, playerStrike - rat.defense)).toBeGreaterThan(
      Math.max(1, playerStrike - beast.defense),
    );
  });

  it('spawn nativo da Zona 1 fica em 1–3, independente do hash', () => {
    const levels = new Set<number>();
    for (let i = 0; i < 40; i += 1) {
      const level = resolveMonsterNativeLevel(ZoneId.Zone1, `spawn-${i}`);
      expect(level).toBeGreaterThanOrEqual(1);
      expect(level).toBeLessThanOrEqual(3);
      levels.add(level);
    }
    expect(levels.size).toBeGreaterThan(1);
    expect(resolveMonsterNativeLevel(ZoneId.Zone1, '')).toBe(1);
  });
});
