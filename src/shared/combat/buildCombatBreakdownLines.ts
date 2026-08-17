import { ItemBuffType, type ItemBuffTypeId } from '../items/itemTypes.js';
import type { CombatActionBreakdown, CombatBreakdownLine } from './combatActionBreakdown.js';
import type { CombatStatSources } from '../types.js';
import {
  ITEM_BUFF_DISPLAY_ORDER,
  type BuffPercentByType,
  type CombatBreakdownSourceId,
} from './combatBuffSnapshot.js';
import { MoveScalingStat } from './moveTypes.js';

export type CombatBreakdownStatKind = ItemBuffTypeId | 'damage_reduction';

function attackStatContributes(buffType: ItemBuffTypeId, scalingStat?: string): boolean {
  if (buffType === ItemBuffType.Strength) return true;
  return scalingStat === MoveScalingStat.CRIT && buffType === ItemBuffType.Critical;
}

function defenseStatContributes(buffType: ItemBuffTypeId | 'damage_reduction'): boolean {
  return buffType === ItemBuffType.Defense || buffType === 'damage_reduction';
}

function appendBuffLines(
  lines: CombatBreakdownLine[],
  source: CombatBreakdownSourceId,
  buffMap: BuffPercentByType | undefined,
  percentBase: number,
  side: 'attack' | 'defense',
  scalingStat?: string,
): void {
  if (!buffMap) return;

  for (const buffType of ITEM_BUFF_DISPLAY_ORDER) {
    const percent = buffMap[buffType] ?? 0;
    if (percent <= 0) continue;

    const contributes = side === 'attack'
      ? attackStatContributes(buffType, scalingStat)
      : defenseStatContributes(buffType);
    const value = contributes ? Math.floor(percentBase * percent / 100) : 0;

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
  scalingStat?: string,
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
      // Redução % aplica multiplicativamente pós-golpe (CombatEngine.applyDirectDamage) —
      // não entra na soma subtrativa de defesa (evita contagem dupla).
      lines.push({
        source: 'marcos',
        statKind: 'damage_reduction',
        percent: sources.marcoDamageReductionPercent,
        value: 0,
        includeInTotal: false,
      });
    }
  }

  if (sources.marcoCritPercent > 0) {
    const critScalesStrike = scalingStat === MoveScalingStat.CRIT;
    lines.push({
      source: 'marcos',
      buffType: ItemBuffType.Critical,
      percent: sources.marcoCritPercent,
      value: critScalesStrike ? Math.floor(classStat * sources.marcoCritPercent / 100) : 0,
      includeInTotal: critScalesStrike,
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
  scalingStat?: string,
): CombatActionBreakdown {
  const classAttack = Math.max(0, Math.floor(classAtk));
  const moveValue = Math.max(0, Math.floor(movePower));
  const strikeBase = classAttack + moveValue;
  const lines: CombatBreakdownLine[] = [
    { source: 'ataque', percent: 0, value: classAttack, includeInTotal: true },
    { source: 'moveset', percent: 0, value: moveValue, includeInTotal: true },
  ];

  // STR % do SET/runa/livro/marcos aplica sobre (ATK classe + poder do move).
  // Moves de scaling CRIT (Execução) também somam CRIT% no golpe — identidade Cogitor.
  appendBuffLines(lines, 'equip', sources.equipByBuff, strikeBase, 'attack', scalingStat);
  appendBuffLines(lines, 'amuleto', sources.amuletByBuff, strikeBase, 'attack', scalingStat);
  appendBuffLines(lines, 'anel', sources.ringByBuff, strikeBase, 'attack', scalingStat);
  appendBuffLines(lines, 'livro', sources.bookByBuff, strikeBase, 'attack', scalingStat);
  appendBuffLines(lines, 'runa', sources.runeByBuff, strikeBase, 'attack', scalingStat);
  appendMarcosLines(lines, sources, strikeBase, 'attack', scalingStat);

  return { kind: 'attack', lines };
}

export function buildDefenseBreakdownLines(
  sources: CombatStatSources,
  classDef: number,
  incomingStrike = 0,
): CombatActionBreakdown {
  const lines: CombatBreakdownLine[] = [
    { source: 'classe', percent: 0, value: classDef, includeInTotal: true },
  ];

  // DEF% do SET aplica sobre o golpe recebido (espelha STR% sobre ATK+poder).
  const gearDefBase = incomingStrike > 0 ? incomingStrike : classDef;
  appendBuffLines(lines, 'equip', sources.equipByBuff, gearDefBase, 'defense');
  appendBuffLines(lines, 'amuleto', sources.amuletByBuff, gearDefBase, 'defense');
  appendBuffLines(lines, 'anel', sources.ringByBuff, gearDefBase, 'defense');
  appendBuffLines(lines, 'livro', sources.bookByBuff, gearDefBase, 'defense');
  appendBuffLines(lines, 'runa', sources.runeByBuff, gearDefBase, 'defense');
  appendMarcosLines(lines, sources, classDef, 'defense');

  return { kind: 'defense', lines };
}
