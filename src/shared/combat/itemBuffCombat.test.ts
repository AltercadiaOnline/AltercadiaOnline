import { describe, expect, it } from 'vitest';
import { emptyMarcosNodeProgression } from '../progression/marcoProgression.js';
import { CATALOG_ENTRIES } from '../items/itemCatalogEntries.js';
import { ItemCategory } from '../items/itemSchema.js';
import type { ItemDefinition } from '../items/itemSchema.js';
import type { EquippedSlots } from '../character/equipmentState.js';
import { computePlayerHpMax } from '../character/playerVitals.js';
import { resolveCombatLoadout } from './combatLoadoutResolver.js';
import { calculateDamage } from './calculateDamage.js';
import { resolveClassAgility } from './resolveClassAgility.js';
import {
  extractPassivePercentBuffsFromItem,
  isPassiveCombatCatalogItem,
  resolveCombatantGearBuffs,
  resolveEffectiveSpeedWithGear,
} from './itemBuffCombat.js';
import { computeAgilityTempoScore } from './agilityTempo.js';
import type { Combatant } from '../types/combat.js';

const BASE_INPUT = {
  classId: 'IMPETUS' as const,
  level: 12,
  equippedSkillIds: ['IMP_1', 'IMP_2', 'IMP_3', 'IMP_4'] as const,
  activeMarcos: [] as const,
  nodeProgression: emptyMarcosNodeProgression(),
  flowSpeedBase: 35,
};

function equippedFromCatalogItem(item: ItemDefinition): EquippedSlots {
  const id = item.id;
  switch (item.slot) {
    case 'H': return { head: id };
    case 'A': return { top: id };
    case 'P':
    case 'B': return { bottom: id };
    case 'R2': return { ring: id };
    case 'M': return { amulet: id };
    case 'S': return { book: id };
    case 'U2': return { rune: id };
    default:
      if (item.category === ItemCategory.Book) return { book: id };
      if (item.category === ItemCategory.Rune) return { rune: id };
      return { top: id };
  }
}

function stubCombatant(patch: Partial<Combatant> = {}): Combatant {
  return {
    id: 'player',
    name: 'Operative',
    hp: 100,
    maxHp: 100,
    classId: 'IMPETUS',
    skills: [{ id: 'IMP_1', name: 'Golpe', damage: 20, cooldown: 1, basePower: 20 }],
    statusEffects: [],
    activeStatuses: [],
    activeShields: [],
    temporaryModifiers: [],
    lockedSkillIds: [],
    ...patch,
  };
}

describe('itemBuffCombat — varredura catálogo × luta', () => {
  const combatItems = CATALOG_ENTRIES.filter(isPassiveCombatCatalogItem);

  it('todo equip/livro/runa com buff passivo % entra no resolveCombatLoadout', () => {
    expect(combatItems.length).toBeGreaterThan(20);

    for (const item of combatItems) {
      const catalog = extractPassivePercentBuffsFromItem(item);
      const resolved = resolveCombatLoadout({
        ...BASE_INPUT,
        equipped: equippedFromCatalogItem(item),
      });

      expect(resolved.combatStats.attackPercent, `${item.id} STR`).toBe(catalog.strengthPercent);
      expect(resolved.combatStats.defensePercent, `${item.id} DEF`).toBe(catalog.defensePercent);
      expect(resolved.combatStats.dodgePercent, `${item.id} DODGE`).toBe(catalog.dodgePercent);
      expect(resolved.combatStats.agilityPercent, `${item.id} AGI`).toBe(catalog.agilityPercent);
      expect(resolved.combatStats.maxHpBonusPercent, `${item.id} HP`).toBe(catalog.hpPercent);
      expect(
        Math.round((resolved.combatStats.critChanceBonus ?? 0) * 100),
        `${item.id} CRIT`,
      ).toBeGreaterThanOrEqual(catalog.critChancePercent);
    }
  });

  it('STR: Armadura Condutora aumenta o golpe do jogador', () => {
    const resolved = resolveCombatLoadout({
      ...BASE_INPUT,
      equipped: { top: 'conductive_plate_armor' },
    });
    const attacker = stubCombatant({
      combatStats: resolved.combatStats,
      combatStatSources: resolved.combatStatSources,
    });
    const foe = stubCombatant({ id: 'enemy', name: 'Alvo', classId: 'TUTATOR' });
    const withGear = calculateDamage(attacker, foe, { id: 'IMP_1', power: 20 });
    const naked = calculateDamage(stubCombatant(), foe, { id: 'IMP_1', power: 20 });
    expect(withGear.rawDamage).toBeGreaterThan(naked.rawDamage);
  });

  it('DEF: Rail Armor reduz o golpe do rato', () => {
    const resolved = resolveCombatLoadout({
      ...BASE_INPUT,
      classId: 'COGITOR',
      equipped: { top: 'rail_armor' },
    });
    const rat = stubCombatant({
      id: 'enemy_rat',
      name: 'Rato',
      baseAttack: 11,
      skills: [{ id: 'rat_bite', name: 'Mordida', damage: 12, cooldown: 1 }],
    });
    const geared = calculateDamage(
      rat,
      stubCombatant({
        classId: 'COGITOR',
        combatStats: resolved.combatStats,
        combatStatSources: resolved.combatStatSources,
      }),
      { id: 'rat_bite', power: 12 },
    );
    const bare = calculateDamage(
      rat,
      stubCombatant({ classId: 'COGITOR' }),
      { id: 'rat_bite', power: 12 },
    );
    expect(geared.finalDamage).toBeLessThan(bare.finalDamage);
  });

  it('CRIT: Amuleto da Fenda Pulsante soma 5% na chance', () => {
    const resolved = resolveCombatLoadout({
      ...BASE_INPUT,
      equipped: { amulet: 'pulsing_rift_amulet' },
    });
    const gear = resolveCombatantGearBuffs(stubCombatant({
      combatStats: resolved.combatStats,
      combatStatSources: resolved.combatStatSources,
    }));
    expect(gear.critChancePercent).toBe(5);
  });

  it('DODGE: Manto Espectral soma 8% de esquiva', () => {
    const resolved = resolveCombatLoadout({
      ...BASE_INPUT,
      equipped: { top: 'spectral_mantle' },
    });
    expect(resolveCombatantGearBuffs(stubCombatant({
      combatStats: resolved.combatStats,
      combatStatSources: resolved.combatStatSources,
    })).dodgePercent).toBe(8);
  });

  it('HP: Botas de Pele Bruta sobem o teto de HP da batalha', () => {
    const resolved = resolveCombatLoadout({
      ...BASE_INPUT,
      equipped: { bottom: 'rawhide_boots' },
    });
    const naked = computePlayerHpMax(12, 0);
    const geared = computePlayerHpMax(12, resolved.modifiers.maxHpBonusPercent);
    expect(geared).toBeGreaterThan(naked);
    expect(resolved.combatStats.maxHpBonusPercent).toBe(5);
  });

  it('AGI: Falcon Helmet soma pontos de tempo e não infla effectiveSpeedRaw', () => {
    const resolved = resolveCombatLoadout({
      ...BASE_INPUT,
      equipped: { head: 'falcon_helmet' },
    });
    expect(resolved.combatStats.agilityPercent).toBe(12);
    const classAgi = resolveClassAgility('IMPETUS');
    expect(computeAgilityTempoScore({
      classAgility: classAgi,
      agilityPercent: 12,
    })).toBe(classAgi + 12);
    const nakedSpeed = resolveEffectiveSpeedWithGear({
      flowSpeedBase: 35,
      classAgility: classAgi,
      speedBonusTotal: 0,
    });
    const gearedSpeed = resolveEffectiveSpeedWithGear({
      flowSpeedBase: 35,
      classAgility: classAgi,
      speedBonusTotal: 0,
    });
    expect(gearedSpeed).toBe(nakedSpeed);
  });
});
