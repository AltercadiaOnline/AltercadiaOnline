import { ItemBuffType, type ItemBuffTypeId } from '../items/itemTypes.js';
import type { CombatActionBreakdown, CombatBreakdownLine } from './combatActionBreakdown.js';
import type { CombatStatSources } from '../types.js';
import {
  ITEM_BUFF_DISPLAY_ORDER,
  type BuffPercentByType,
  type CombatBreakdownSourceId,
} from './combatBuffSnapshot.js';

export type CombatBreakdownStatKind = ItemBuffTypeId | 'damage_reduction';

function attackStatContributes(buffType: ItemBuffTypeId): boolean {
  return buffType === ItemBuffType.Strength;
}

function defenseStatContributes(buffType: ItemBuffTypeId | 'damage_reduction'): boolean {
  return buffType === ItemBuffType.Defense || buffType === 'damage_reduction';
}

function appendBuffLines(
  lines: CombatBreakdownLine[],
  source: CombatBreakdownSourceId,
  buffMap: BuffPercentByType | undefined,
  classStat: number,
  side: 'attack' | 'defense',
): void {
  if (!buffMap) return;

  for (const buffType of ITEM_BUFF_DISPLAY_ORDER) {
    const percent = buffMap[buffType] ?? 0;
    if (percent <= 0) continue;

    const contributes = side === 'attack' ? attackStatContributes(buffType) : defenseStatContributes(buffType);
    const value = contributes ? Math.floor(classStat * percent / 100) : 0;

    lines.push({
      source,
      buffType,
      percent,
      value,
      includeInTotal: contributes,
    });
  }
}

function appendMarcosLines(
  lines: CombatBreakdownLine[],
  sources: CombatStatSources,
  classStat: number,
  side: 'attack' | 'defense',
): void {
  if (side === 'attack' && sources.attackMarcosPercent > 0) {
    const percent = sources.attackMarcosPercent;
    lines.push({
      source: 'marcos',
      buffType: ItemBuffType.Strength,
      percent,
      value: Math.floor(classStat * percent / 100),
      includeInTotal: true,
    });
  }

  if (side === 'defense') {
    if (sources.defenseMarcosPercent > 0) {
      const percent = sources.defenseMarcosPercent;
      lines.push({
        source: 'marcos',
        buffType: ItemBuffType.Defense,
        percent,
        value: Math.floor(classStat * percent / 100),
        includeInTotal: true,
      });
    }
    if (sources.marcoDamageReductionPercent > 0) {
      const percent = sources.marcoDamageReductionPercent;
      lines.push({
        source: 'marcos',
        statKind: 'damage_reduction',
        percent,
        value: Math.floor(classStat * percent / 100),
        includeInTotal: true,
      });
    }
  }

  if (sources.marcoCritPercent > 0) {
    lines.push({
      source: 'marcos',
      buffType: ItemBuffType.Critical,
      percent: sources.marcoCritPercent,
      value: 0,
      includeInTotal: false,
    });
  }
  if (sources.marcoDodgePercent > 0) {
    lines.push({
      source: 'marcos',
      buffType: ItemBuffType.Dodge,
      percent: sources.marcoDodgePercent,
      value: 0,
      includeInTotal: false,
    });
  }
}

export function buildAttackBreakdownLines(
  sources: CombatStatSources,
  classAtk: number,
  movePower: number,
): CombatActionBreakdown {
  const lines: CombatBreakdownLine[] = [
    { source: 'moveset', percent: 0, value: classAtk + movePower, includeInTotal: true },
  ];

  appendBuffLines(lines, 'equip', sources.equipByBuff, classAtk, 'attack');
  appendBuffLines(lines, 'amuleto', sources.amuletByBuff, classAtk, 'attack');
  appendBuffLines(lines, 'anel', sources.ringByBuff, classAtk, 'attack');
  appendBuffLines(lines, 'livro', sources.bookByBuff, classAtk, 'attack');
  appendBuffLines(lines, 'runa', sources.runeByBuff, classAtk, 'attack');
  appendMarcosLines(lines, sources, classAtk, 'attack');

  return { kind: 'attack', lines };
}

export function buildDefenseBreakdownLines(
  sources: CombatStatSources,
  classDef: number,
): CombatActionBreakdown {
  const lines: CombatBreakdownLine[] = [
    { source: 'classe', percent: 0, value: classDef, includeInTotal: true },
  ];

  appendBuffLines(lines, 'equip', sources.equipByBuff, classDef, 'defense');
  appendBuffLines(lines, 'amuleto', sources.amuletByBuff, classDef, 'defense');
  appendBuffLines(lines, 'anel', sources.ringByBuff, classDef, 'defense');
  appendBuffLines(lines, 'livro', sources.bookByBuff, classDef, 'defense');
  appendBuffLines(lines, 'runa', sources.runeByBuff, classDef, 'defense');
  appendMarcosLines(lines, sources, classDef, 'defense');

  return { kind: 'defense', lines };
}
