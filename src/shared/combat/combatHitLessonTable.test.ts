import { describe, expect, it } from 'vitest';
import { ItemBuffType } from '../items/itemTypes.js';
import { buildAttackBreakdownLines } from './buildCombatBreakdownLines.js';
import { buildCombatHitLessonTable } from './combatHitLessonTable.js';
import type { CombatStatSources } from '../types.js';

function emptySources(): CombatStatSources {
  return {
    attackRunePercent: 0,
    attackBookPercent: 0,
    attackArmorPercent: 0,
    attackMarcosFlat: 0,
    attackMarcosPercent: 0,
    defenseArmorPercent: 0,
    defenseRunePercent: 0,
    defenseBookPercent: 0,
    defenseMarcosFlat: 0,
    defenseMarcosPercent: 0,
    marcoCritPercent: 0,
    marcoDodgePercent: 0,
    marcoDamageReductionPercent: 0,
  };
}

describe('buildCombatHitLessonTable', () => {
  it('mostra ATK, Move, SET, defesa e crítico na ordem da conta', () => {
    const attack = buildAttackBreakdownLines(
      {
        ...emptySources(),
        equipByBuff: { [ItemBuffType.Strength]: 10 },
      },
      20,
      15,
    );
    const rows = buildCombatHitLessonTable({
      attackBreakdown: attack,
      defenseTotal: 4,
      damageReceived: 47,
      mitigation: { isCritical: true, critBonusPercent: 45 },
    });

    expect(rows.map((row) => `${row.label} ${row.display}`)).toEqual([
      'ATK 20',
      'Move 15',
      'Equip Força +3',
      'Golpe 38',
      'Defesa −4',
      'Base 34',
      'Crítico +45%',
      'Dano −47',
    ]);
  });
});
