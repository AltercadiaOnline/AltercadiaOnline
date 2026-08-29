import { describe, expect, it } from 'vitest';
import { ItemBuffType } from '../items/itemTypes.js';
import { buildAttackBreakdownLines, buildDefenseBreakdownLines } from './buildCombatBreakdownLines.js';
import {
  buildDefenseBreakdown,
  sumAttackBreakdownTotal,
  sumDefenseBreakdownTotal,
} from './combatBreakdownBuilder.js';
import { calculateDamage } from './calculateDamage.js';
import { resolveCombatLoadout } from './combatLoadoutResolver.js';
import { emptyMarcosNodeProgression } from '../progression/marcoProgression.js';
import { CLASS_CATALOG } from '../types/classes.js';
import type { Combatant, CombatStatSources } from '../types.js';

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

  it('DEF% do SET aplica sobre classe + ficha, não sobre o golpe recebido', () => {
    const classDef = 2;
    const breakdown = buildDefenseBreakdownLines(
      minimalSources({
        equipByBuff: { [ItemBuffType.Defense]: 15 },
        allocatedDefenseFlat: 12,
      }),
      classDef,
    );
    const characterDef = classDef + 12;
    expect(sumDefenseBreakdownTotal(breakdown)).toBe(
      characterDef + Math.ceil(characterDef * 15 / 100),
    );
  });

  it('soma os % do SET e arredonda para cima uma vez', () => {
    const classDef = 5;
    const breakdown = buildDefenseBreakdownLines(
      minimalSources({
        equipByBuff: { [ItemBuffType.Defense]: 5 },
        amuletByBuff: { [ItemBuffType.Defense]: 5 },
      }),
      classDef,
    );
    expect(sumDefenseBreakdownTotal(breakdown)).toBe(classDef + Math.ceil(classDef * 10 / 100));
  });
});

describe('buildAttackBreakdownLines', () => {
  it('strength from equip, amulet, ring, book and rune sum into attack total', () => {
    const classAtk = 100;
    const movePower = 25;
    const characterAtk = classAtk;
    const strikeBase = classAtk + movePower;
    const gearPercent = 10 + 5 + 5 + 10 + 10;
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

    expect(sumAttackBreakdownTotal(breakdown)).toBe(
      strikeBase
      + Math.ceil(characterAtk * gearPercent / 100)
      + Math.floor(strikeBase * 20 / 100),
    );
  });

  it('STR% do SET ignora o poder do move', () => {
    const classAtk = 3;
    const movePower = 30;
    const breakdown = buildAttackBreakdownLines(
      minimalSources({
        equipByBuff: { [ItemBuffType.Strength]: 8 },
        amuletByBuff: { [ItemBuffType.Strength]: 8 },
      }),
      classAtk,
      movePower,
    );

    expect(sumAttackBreakdownTotal(breakdown)).toBe(
      classAtk + movePower + Math.ceil(classAtk * 16 / 100),
    );
    expect(breakdown.lines.some((line) => line.source === 'equip' && line.percent === 8)).toBe(true);
    expect(breakdown.lines.some((line) => line.source === 'amuleto' && line.percent === 8)).toBe(true);
  });

  it('ficha ATK entra na base da % do SET, não no poder do move', () => {
    const classAtk = 6;
    const movePower = 10;
    const ficha = 4;
    const characterAtk = classAtk + ficha;
    const breakdown = buildAttackBreakdownLines(
      minimalSources({
        equipByBuff: { [ItemBuffType.Strength]: 50 },
        allocatedAttackFlat: ficha,
      }),
      classAtk,
      movePower,
    );
    expect(sumAttackBreakdownTotal(breakdown)).toBe(
      classAtk + movePower + ficha + Math.ceil(characterAtk * 50 / 100),
    );
  });
});

describe('SET DEF na (classe + ficha)', () => {
  const emptyCombatant = (patch: Partial<Combatant>): Combatant => ({
    id: 'player',
    name: 'Operative',
    hp: 100,
    maxHp: 100,
    classId: 'COGITOR',
    skills: [],
    statusEffects: [],
    activeStatuses: [],
    activeShields: [],
    temporaryModifiers: [],
    lockedSkillIds: [],
    ...patch,
  });

  it('10% DEF do SET reduz o golpe mesmo com maps vazios (só combatStats)', () => {
    const defender = emptyCombatant({
      combatStats: { defensePercent: 10 },
    });
    const breakdown = buildDefenseBreakdown(defender, null);
    const classDef = CLASS_CATALOG.COGITOR.bonus.defense;
    expect(sumDefenseBreakdownTotal(breakdown)).toBe(
      classDef + Math.ceil(classDef * 10 / 100),
    );
  });

  it('Rato vs COGITOR: Armadura de Trilhos corta o dano em relação ao nu', () => {
    const resolved = resolveCombatLoadout({
      classId: 'COGITOR',
      level: 1,
      equippedSkillIds: ['COG_1', 'COG_2', 'COG_3', 'COG_4'],
      activeMarcos: [],
      nodeProgression: emptyMarcosNodeProgression(),
      flowSpeedBase: 35,
      equipped: { top: 'rail_armor' },
    });
    const rat: Combatant = {
      id: 'enemy_rat',
      name: 'Rato',
      hp: 70,
      maxHp: 70,
      baseAttack: 11,
      skills: [{ id: 'rat_bite', name: 'Mordida', damage: 12, cooldown: 1 }],
      statusEffects: [],
      activeStatuses: [],
      activeShields: [],
      temporaryModifiers: [],
      lockedSkillIds: [],
    };
    const withGear = emptyCombatant({
      combatStats: resolved.combatStats,
      combatStatSources: resolved.combatStatSources,
    });
    const naked = emptyCombatant({});
    const geared = calculateDamage(rat, withGear, { id: 'rat_bite', power: 12 });
    const bare = calculateDamage(rat, naked, { id: 'rat_bite', power: 12 });
    expect(geared.finalDamage).toBeLessThan(bare.finalDamage);
    expect(geared.finalDamage).toBe(
      bare.finalDamage - Math.ceil(CLASS_CATALOG.COGITOR.bonus.defense * 10 / 100),
    );
  });
});
