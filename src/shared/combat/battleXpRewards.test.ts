import { describe, expect, it } from 'vitest';
import { ZoneId } from '../items/itemTypes.js';
import { resolveMonsterStats, resolveMonsterZoneDefaultLevel } from './monsterZoneScaling.js';
import {
  resolveBattleXpGain,
  resolveDefeatedCreatureLevel,
  resolveSessionPveDefeatedLevel,
  resolveZoneBattleXpPool,
} from './battleXpRewards.js';

describe('battleXpRewards — XP é da zona, não do jogador', () => {
  it('fallback de criatura usa nível típico da zona (combate/loot)', () => {
    expect(resolveDefeatedCreatureLevel('rat')).toBe(
      resolveMonsterZoneDefaultLevel(ZoneId.Zone1),
    );
    expect(resolveDefeatedCreatureLevel('centipede')).toBe(
      resolveMonsterZoneDefaultLevel(ZoneId.Zone2),
    );
  });

  it('sessão PvE prefere pveEnemyCombatLevel para combate (não para XP)', () => {
    const stats = resolveMonsterStats(ZoneId.Zone1, 7, false);
    expect(resolveSessionPveDefeatedLevel({ pveEnemyCombatLevel: stats.level }, 'rat')).toBe(
      stats.level,
    );
    expect(resolveSessionPveDefeatedLevel({ pveEnemyCombatLevel: 3 }, 'rat')).toBe(3);
  });

  it('rato da Zona 1 dá o mesmo XP no nível 1 e no 70', () => {
    const zone1 = resolveZoneBattleXpPool(ZoneId.Zone1);
    expect(zone1).toBe(25);
    expect(resolveBattleXpGain('rat')).toBe(zone1);
    expect(resolveBattleXpGain('rat', 1)).toBe(zone1);
    expect(resolveBattleXpGain('rat', 10)).toBe(zone1);
    expect(resolveBattleXpGain('rat', 70)).toBe(zone1);
  });

  it('zona 2 não herda o XP da zona 1', () => {
    expect(resolveBattleXpGain('centipede')).toBe(resolveZoneBattleXpPool(ZoneId.Zone2));
    expect(resolveBattleXpGain('centipede', 70)).toBe(resolveBattleXpGain('centipede', 1));
    expect(resolveBattleXpGain('centipede')).toBeGreaterThan(resolveBattleXpGain('rat'));
  });
});
