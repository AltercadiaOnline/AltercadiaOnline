import type { MonsterCatalogEntry } from './MonsterCatalog.js';
import type { CombatActionBreakdown } from './combatActionBreakdown.js';
import type { Combatant, CombatStatSources } from '../types.js';
import { CLASS_CATALOG, type ClassType } from '../types/classes.js';
import { ItemBuffType } from '../items/itemTypes.js';
import {
  buildAttackBreakdownLines,
  buildDefenseBreakdownLines,
} from './buildCombatBreakdownLines.js';
import type { BuffPercentByType } from './combatBuffSnapshot.js';

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
  const classId = (combatant.classId ?? monster?.classId ?? 'IMPETUS') as ClassType;
  return CLASS_CATALOG[classId]?.bonus.attack ?? 5;
}

export function resolveClassDefense(combatant: Combatant, monster?: MonsterCatalogEntry | null): number {
  const classId = (combatant.classId ?? monster?.classId ?? 'TUTATOR') as ClassType;
  return CLASS_CATALOG[classId]?.bonus.defense ?? 2;
}

function withLegacyEquipBuffMaps(sources: CombatStatSources): CombatStatSources {
  let equipByBuff = sources.equipByBuff;
  if (!equipByBuff && (sources.attackArmorPercent > 0 || sources.defenseArmorPercent > 0)) {
    const legacy: BuffPercentByType = {};
    if (sources.attackArmorPercent > 0) legacy[ItemBuffType.Strength] = sources.attackArmorPercent;
    if (sources.defenseArmorPercent > 0) legacy[ItemBuffType.Defense] = sources.defenseArmorPercent;
    equipByBuff = legacy;
  }

  let bookByBuff = sources.bookByBuff;
  if (!bookByBuff && (sources.attackBookPercent > 0 || sources.defenseBookPercent > 0)) {
    const legacy: BuffPercentByType = {};
    if (sources.attackBookPercent > 0) legacy[ItemBuffType.Strength] = sources.attackBookPercent;
    if (sources.defenseBookPercent > 0) legacy[ItemBuffType.Defense] = sources.defenseBookPercent;
    bookByBuff = legacy;
  }

  let runeByBuff = sources.runeByBuff;
  if (!runeByBuff && (sources.attackRunePercent > 0 || sources.defenseRunePercent > 0)) {
    const legacy: BuffPercentByType = {};
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

function resolveSources(combatant: Combatant): CombatStatSources {
  return withLegacyEquipBuffMaps(combatant.combatStatSources ?? EMPTY_SOURCES);
}

export function buildAttackBreakdown(
  attacker: Combatant,
  movePower: number,
  attackerMonster?: MonsterCatalogEntry | null,
): CombatActionBreakdown {
  const classAtk = resolveClassAttack(attacker, attackerMonster);
  return buildAttackBreakdownLines(resolveSources(attacker), classAtk, movePower);
}

export function buildDefenseBreakdown(
  defender: Combatant,
  defenderMonster?: MonsterCatalogEntry | null,
): CombatActionBreakdown {
  const classDef = resolveClassDefense(defender, defenderMonster);
  return buildDefenseBreakdownLines(resolveSources(defender), classDef);
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
