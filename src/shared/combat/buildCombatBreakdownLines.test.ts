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

  it('DEF% do SET aplica sobre o golpe recebido, não só a defesa de classe', () => {
    const classDef = 2;
    const incomingStrike = 40;
    const breakdown = buildDefenseBreakdownLines(
      minimalSources({
        equipByBuff: { [ItemBuffType.Defense]: 15 },
      }),
      classDef,
      incomingStrike,
    );
    expect(sumDefenseBreakdownTotal(breakdown)).toBe(classDef + Math.floor(incomingStrike * 15 / 100));
  });
});

describe('buildAttackBreakdownLines', () => {
  it('strength from equip, amulet, ring, book and rune sum into attack total', () => {
    const classAtk = 100;
    const movePower = 25;
    const strikeBase = classAtk + movePower;
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

    // % aplica sobre (classe + moveset), não só ATK de classe.
    expect(sumAttackBreakdownTotal(breakdown)).toBe(
      strikeBase
      + Math.floor(strikeBase * 10 / 100)
      + Math.floor(strikeBase * 5 / 100)
      + Math.floor(strikeBase * 5 / 100)
      + Math.floor(strikeBase * 10 / 100)
      + Math.floor(strikeBase * 10 / 100)
      + Math.floor(strikeBase * 20 / 100),
    );
  });

  it('low class ATK still shows visible equip bonus from move power', () => {
    const classAtk = 3; // COGITOR
    const movePower = 30;
    const strikeBase = 33;
    const breakdown = buildAttackBreakdownLines(
      minimalSources({
        equipByBuff: { [ItemBuffType.Strength]: 8 },
        amuletByBuff: { [ItemBuffType.Strength]: 8 },
      }),
      classAtk,
      movePower,
    );

    expect(sumAttackBreakdownTotal(breakdown)).toBe(
      strikeBase
      + Math.floor(strikeBase * 8 / 100)
      + Math.floor(strikeBase * 8 / 100),
    );
    expect(breakdown.lines.some((line) => line.source === 'equip' && line.value > 0)).toBe(true);
    expect(breakdown.lines.some((line) => line.source === 'amuleto' && line.value > 0)).toBe(true);
  });
});

describe('SET DEF no golpe recebido', () => {
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
    const incomingStrike = 23;
    const defender = emptyCombatant({
      combatStats: { defensePercent: 10 },
    });
    const breakdown = buildDefenseBreakdown(defender, null, incomingStrike);
    expect(sumDefenseBreakdownTotal(breakdown)).toBe(3 + Math.floor(incomingStrike * 10 / 100));
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
    expect(geared.finalDamage).toBe(bare.finalDamage - Math.floor(23 * 10 / 100));
  });
});
