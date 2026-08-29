import { describe, expect, it } from 'vitest';
import { ItemBuffType } from '../items/itemTypes.js';
import { buildDefenseBreakdownLines } from './buildCombatBreakdownLines.js';
import {
  formatCombatBreakdownSumEquation,
  formatCombatBuildRoster,
} from './combatActionBreakdown.js';
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

describe('HUD de decomposição', () => {
  it('equação e roster usam pontos do SET, não o % do catálogo', () => {
    const breakdown = buildDefenseBreakdownLines(
      minimalSources({
        equipByBuff: { [ItemBuffType.Defense]: 10 },
      }),
      5,
    );

    expect(formatCombatBreakdownSumEquation(breakdown)).toBe(
      'Defesa 5 + Equip +1 Defesa = 6',
    );
    expect(formatCombatBuildRoster(breakdown)).toBe(
      'Defesa 5 · Equip +1 Defesa',
    );
  });

  it('ficha entra na base da % antes do extra do SET', () => {
    const breakdown = buildDefenseBreakdownLines(
      minimalSources({
        equipByBuff: { [ItemBuffType.Defense]: 10 },
        allocatedDefenseFlat: 12,
      }),
      5,
    );

    expect(formatCombatBreakdownSumEquation(breakdown)).toBe(
      'Defesa 5 + Ficha +12 + Equip +2 Defesa = 19',
    );
  });
});
