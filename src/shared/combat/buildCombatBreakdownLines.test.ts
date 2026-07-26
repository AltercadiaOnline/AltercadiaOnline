import { describe, expect, it } from 'vitest';
import { ItemBuffType } from '../items/itemTypes.js';
import { buildAttackBreakdownLines, buildDefenseBreakdownLines } from './buildCombatBreakdownLines.js';
import { sumAttackBreakdownTotal, sumDefenseBreakdownTotal } from './combatBreakdownBuilder.js';
import type { CombatStatSources } from '../types.js';

function minimalSources(patch: Partial<CombatStatSources> = {}): CombatStatSources {
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
    ...patch,
  };
}

describe('buildDefenseBreakdownLines', () => {
  it('marco damage reduction is display-only — not subtracted in defense total', () => {
    const classDef = 10;
    const breakdown = buildDefenseBreakdownLines(
      minimalSources({ marcoDamageReductionPercent: 15 }),
      classDef,
    );

    const reductionLine = breakdown.lines.find((line) => line.statKind === 'damage_reduction');
    expect(reductionLine?.includeInTotal).toBe(false);
    expect(sumDefenseBreakdownTotal(breakdown)).toBe(classDef);
  });

  it('marco defense percent still adds to defense total', () => {
    const classDef = 10;
    const breakdown = buildDefenseBreakdownLines(
      minimalSources({ defenseMarcosPercent: 20 }),
      classDef,
    );
    expect(sumDefenseBreakdownTotal(breakdown)).toBe(classDef + 2);
  });
});

describe('buildAttackBreakdownLines', () => {
  it('strength from equip, amulet, ring, book and rune sum into attack total', () => {
    const classAtk = 100;
    const movePower = 25;
    const breakdown = buildAttackBreakdownLines(
      minimalSources({
        equipByBuff: { [ItemBuffType.Strength]: 10 },
        amuletByBuff: { [ItemBuffType.Strength]: 5 },
        ringByBuff: { [ItemBuffType.Strength]: 5 },
        bookByBuff: { [ItemBuffType.Strength]: 10 },
        runeByBuff: { [ItemBuffType.Strength]: 10 },
        attackMarcosPercent: 20,
      }),
      classAtk,
      movePower,
    );

    expect(sumAttackBreakdownTotal(breakdown)).toBe(100 + 25 + 10 + 5 + 5 + 10 + 10 + 20);
  });
});
