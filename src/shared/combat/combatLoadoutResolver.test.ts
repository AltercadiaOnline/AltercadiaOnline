import { describe, expect, it } from 'vitest';
import { emptyMarcosNodeProgression } from '../progression/marcoProgression.js';
import { resolveCombatLoadout } from './combatLoadoutResolver.js';

const BASE_INPUT = {
  classId: 'IMPETUS' as const,
  level: 1,
  equippedSkillIds: ['IMP_1', 'IMP_2', 'IMP_3', 'IMP_4'] as const,
  activeMarcos: [] as const,
  nodeProgression: emptyMarcosNodeProgression(),
  flowSpeedBase: 35,
};

describe('resolveCombatLoadout rune IMPACT crit', () => {
  it('Runa de Fúria +12% entra na chance de crítico do combatente', () => {
    const resolved = resolveCombatLoadout({
      ...BASE_INPUT,
      equipped: { rune: 'runa_furia' },
    });
    expect(resolved.combatStats.critChanceBonus).toBeCloseTo(0.12);
  });

  it('Runa Volts Overclock soma passivo 5% + IMPACT 15%', () => {
    const resolved = resolveCombatLoadout({
      ...BASE_INPUT,
      equipped: { rune: 'runa_volts_overclock' },
    });
    expect(resolved.combatStats.critChanceBonus).toBeCloseTo(0.2);
  });

  it('Runa de Reflexo não altera a chance de crítico', () => {
    const resolved = resolveCombatLoadout({
      ...BASE_INPUT,
      equipped: { rune: 'runa_reflexo' },
    });
    expect(resolved.combatStats.critChanceBonus).toBe(0);
  });
});

describe('resolveCombatLoadout SET equipável entra na lógica', () => {
  it('Manto Espectral +8% esquiva', () => {
    const resolved = resolveCombatLoadout({
      ...BASE_INPUT,
      equipped: { top: 'spectral_mantle' },
    });
    expect(resolved.combatStats.dodgePercent).toBe(8);
  });

  it('Amuleto da Fenda Pulsante +5% crítico', () => {
    const resolved = resolveCombatLoadout({
      ...BASE_INPUT,
      equipped: { amulet: 'pulsing_rift_amulet' },
    });
    expect(resolved.combatStats.critChanceBonus).toBeCloseTo(0.05);
  });

  it('Armadura Condutora +8% força no golpe', () => {
    const resolved = resolveCombatLoadout({
      ...BASE_INPUT,
      equipped: { top: 'conductive_plate_armor' },
    });
    expect(resolved.combatStats.attackPercent).toBe(8);
    expect(resolved.combatStatSources.equipByBuff?.strength).toBe(8);
  });

  it('Croco Pants +15% defesa', () => {
    const resolved = resolveCombatLoadout({
      ...BASE_INPUT,
      equipped: { bottom: 'croco_pants' },
    });
    expect(resolved.combatStats.defensePercent).toBe(15);
    expect(resolved.combatStatSources.equipByBuff?.defense).toBe(15);
  });

  it('soma calças mesmo com botas no grid (equipped.bottom sozinho descartaria um)', () => {
    const resolved = resolveCombatLoadout({
      ...BASE_INPUT,
      equipped: { bottom: 'rawhide_boots' },
      equippedItemIds: ['rawhide_boots', 'croco_pants'],
    });
    expect(resolved.combatStats.defensePercent).toBeGreaterThanOrEqual(15);
  });

  it('Armadura de Trilhos +10% DEF entra em combatStats', () => {
    const resolved = resolveCombatLoadout({
      ...BASE_INPUT,
      equipped: { top: 'rail_armor' },
    });
    expect(resolved.combatStats.defensePercent).toBe(10);
    expect(resolved.combatStatSources.equipByBuff?.defense).toBe(10);
  });
});
