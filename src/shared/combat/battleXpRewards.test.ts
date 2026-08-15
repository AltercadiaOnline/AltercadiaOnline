import { describe, expect, it } from 'vitest';
import { ZoneId } from '../items/itemTypes.js';
import { resolveMonsterStats, resolveMonsterZoneDefaultLevel } from './monsterZoneScaling.js';
import {
  resolveBattleXpGain,
  resolveDefeatedCreatureLevel,
  resolveSessionPveDefeatedLevel,
} from './battleXpRewards.js';

describe('battleXpRewards — nível via zone scaling', () => {
  it('fallback de criatura usa nível típico da zona (não maxHp/35)', () => {
    expect(resolveDefeatedCreatureLevel('rat')).toBe(
      resolveMonsterZoneDefaultLevel(ZoneId.Zone1),
    );
    expect(resolveDefeatedCreatureLevel('centipede')).toBe(
      resolveMonsterZoneDefaultLevel(ZoneId.Zone2),
    );
  });

  it('sessão PvE prefere pveEnemyCombatLevel (mesmo clamp de resolveMonsterStats)', () => {
    const stats = resolveMonsterStats(ZoneId.Zone1, 7, false);
    expect(resolveSessionPveDefeatedLevel({ pveEnemyCombatLevel: stats.level }, 'rat')).toBe(
      stats.level,
    );
    expect(resolveSessionPveDefeatedLevel({ pveEnemyCombatLevel: 3 }, 'rat')).toBe(3);
  });

  it('XP escala com o nível da sessão', () => {
    expect(resolveBattleXpGain('rat', 1)).toBe(25);
    expect(resolveBattleXpGain('rat', 10)).toBe(115);
  });
});
