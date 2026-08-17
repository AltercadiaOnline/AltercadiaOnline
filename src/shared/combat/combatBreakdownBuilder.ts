import type { MonsterCatalogEntry } from './MonsterCatalog.js';
import type { CombatActionBreakdown } from './combatActionBreakdown.js';
import type { Combatant, CombatStatSources } from '../types.js';
import { CLASS_CATALOG, type ClassType } from '../types/classes.js';
import { ItemBuffType } from '../items/itemTypes.js';
import {
  resolvePlayerLevelAttack,
  resolvePlayerLevelDefense,
} from './playerCombatLevelScale.js';
import { getCombatRole } from '../pet/petCombatRules.js';
import {
  buildAttackBreakdownLines,
  buildDefenseBreakdownLines,
} from './buildCombatBreakdownLines.js';
import {
  ITEM_BUFF_DISPLAY_ORDER,
  type BuffPercentByType,
} from './combatBuffSnapshot.js';

const EMPTY_SOURCES: CombatStatSources = {
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

export function resolveClassAttack(combatant: Combatant, monster?: MonsterCatalogEntry | null): number {
  const role = getCombatRole(combatant);
  // baseAttack é só de monstro — se um PLAYER herdar 0, o golpe vira só moveset.
  if (role !== 'PLAYER') {
    if (typeof combatant.baseAttack === 'number' && Number.isFinite(combatant.baseAttack)) {
      return Math.max(0, Math.floor(combatant.baseAttack));
    }
    if (typeof monster?.attack === 'number' && Number.isFinite(monster.attack)) {
      return Math.max(0, Math.floor(monster.attack));
    }
  }
  const classId = (combatant.classId ?? monster?.classId ?? 'IMPETUS') as ClassType;
  const base = CLASS_CATALOG[classId]?.bonus.attack ?? 5;
  if (role !== 'PLAYER') return base;
  return resolvePlayerLevelAttack(base, combatant.level);
}

export function resolveClassDefense(combatant: Combatant, monster?: MonsterCatalogEntry | null): number {
  if (typeof combatant.baseDefense === 'number' && Number.isFinite(combatant.baseDefense)) {
    return Math.max(0, Math.floor(combatant.baseDefense));
  }
  const classId = (combatant.classId ?? monster?.classId ?? 'TUTATOR') as ClassType;
  const base = CLASS_CATALOG[classId]?.bonus.defense ?? 2;
  if (getCombatRole(combatant) !== 'PLAYER') return base;
  return resolvePlayerLevelDefense(base, combatant.level);
}

function buffMapHasValue(map: BuffPercentByType | undefined): boolean {
  if (!map) return false;
  return ITEM_BUFF_DISPLAY_ORDER.some((key) => (map[key] ?? 0) > 0);
}

function mappedGearPercent(
  sources: CombatStatSources,
  buffType: typeof ItemBuffType.Defense | typeof ItemBuffType.Strength,
): number {
  return (sources.equipByBuff?.[buffType] ?? 0)
    + (sources.amuletByBuff?.[buffType] ?? 0)
    + (sources.ringByBuff?.[buffType] ?? 0)
    + (sources.bookByBuff?.[buffType] ?? 0)
    + (sources.runeByBuff?.[buffType] ?? 0);
}

function withLegacyEquipBuffMaps(sources: CombatStatSources): CombatStatSources {
  let equipByBuff = sources.equipByBuff;
  const gearMapsEmpty = !buffMapHasValue(equipByBuff)
    && !buffMapHasValue(sources.amuletByBuff)
    && !buffMapHasValue(sources.ringByBuff);
  if (gearMapsEmpty && (sources.attackArmorPercent > 0 || sources.defenseArmorPercent > 0)) {
    const legacy: BuffPercentByType = { ...equipByBuff };
    if (sources.attackArmorPercent > 0) legacy[ItemBuffType.Strength] = sources.attackArmorPercent;
    if (sources.defenseArmorPercent > 0) legacy[ItemBuffType.Defense] = sources.defenseArmorPercent;
    equipByBuff = legacy;
  }

  let bookByBuff = sources.bookByBuff;
  if (!buffMapHasValue(bookByBuff) && (sources.attackBookPercent > 0 || sources.defenseBookPercent > 0)) {
    const legacy: BuffPercentByType = { ...bookByBuff };
    if (sources.attackBookPercent > 0) legacy[ItemBuffType.Strength] = sources.attackBookPercent;
    if (sources.defenseBookPercent > 0) legacy[ItemBuffType.Defense] = sources.defenseBookPercent;
    bookByBuff = legacy;
  }

  let runeByBuff = sources.runeByBuff;
  if (!buffMapHasValue(runeByBuff) && (sources.attackRunePercent > 0 || sources.defenseRunePercent > 0)) {
    const legacy: BuffPercentByType = { ...runeByBuff };
    if (sources.attackRunePercent > 0) legacy[ItemBuffType.Strength] = sources.attackRunePercent;
    if (sources.defenseRunePercent > 0) legacy[ItemBuffType.Defense] = sources.defenseRunePercent;
    runeByBuff = legacy;
  }

  return {
    ...sources,
    ...(equipByBuff ? { equipByBuff } : {}),
    ...(bookByBuff ? { bookByBuff } : {}),
    ...(runeByBuff ? { runeByBuff } : {}),
  };
}

function withCombatStatsGearFallback(
  combatant: Combatant,
  sources: CombatStatSources,
): CombatStatSources {
  const nextEquip: BuffPercentByType = { ...sources.equipByBuff };
  let changed = false;

  const statsDef = combatant.combatStats?.defensePercent ?? 0;
  const mappedDef = mappedGearPercent(sources, ItemBuffType.Defense);
  if (statsDef > mappedDef) {
    nextEquip[ItemBuffType.Defense] = (nextEquip[ItemBuffType.Defense] ?? 0) + (statsDef - mappedDef);
    changed = true;
  }

  const statsAtk = combatant.combatStats?.attackPercent ?? 0;
  const mappedAtk = mappedGearPercent(sources, ItemBuffType.Strength);
  if (statsAtk > mappedAtk) {
    nextEquip[ItemBuffType.Strength] = (nextEquip[ItemBuffType.Strength] ?? 0) + (statsAtk - mappedAtk);
    changed = true;
  }

  if (!changed) return sources;
  return { ...sources, equipByBuff: nextEquip };
}

function resolveSources(combatant: Combatant): CombatStatSources {
  return withCombatStatsGearFallback(
    combatant,
    withLegacyEquipBuffMaps(combatant.combatStatSources ?? EMPTY_SOURCES),
  );
}

export function buildAttackBreakdown(
  attacker: Combatant,
  movePower: number,
  attackerMonster?: MonsterCatalogEntry | null,
  scalingStat?: string,
): CombatActionBreakdown {
  const classAtk = resolveClassAttack(attacker, attackerMonster);
  return buildAttackBreakdownLines(
    resolveSources(attacker),
    classAtk,
    movePower,
    scalingStat,
  );
}

export function buildDefenseBreakdown(
  defender: Combatant,
  defenderMonster?: MonsterCatalogEntry | null,
  incomingStrike = 0,
): CombatActionBreakdown {
  const classDef = resolveClassDefense(defender, defenderMonster);
  return buildDefenseBreakdownLines(resolveSources(defender), classDef, incomingStrike);
}

export function sumAttackBreakdownTotal(breakdown: CombatActionBreakdown): number {
  return breakdown.lines.reduce(
    (sum, line) => sum + (line.includeInTotal === false ? 0 : line.value),
    0,
  );
}

export function sumDefenseBreakdownTotal(breakdown: CombatActionBreakdown): number {
  return breakdown.lines.reduce(
    (sum, line) => sum + (line.includeInTotal === false ? 0 : line.value),
    0,
  );
}
