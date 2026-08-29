import { ItemBuffType, type ItemBuffTypeId } from '../items/itemTypes.js';
import type { CombatActionBreakdown, CombatBreakdownLine } from './combatActionBreakdown.js';
import type { CombatStatSources } from '../types.js';
import {
  ITEM_BUFF_DISPLAY_ORDER,
  type BuffPercentByType,
  type CombatBreakdownSourceId,
} from './combatBuffSnapshot.js';
import { applyCharacterGearPercent } from './itemBuffCombat.js';
import { MoveScalingStat } from './moveTypes.js';

export type CombatBreakdownStatKind = ItemBuffTypeId | 'damage_reduction';

const GEAR_BUFF_SOURCES: ReadonlyArray<{
  readonly source: CombatBreakdownSourceId;
  readonly pick: (sources: CombatStatSources) => BuffPercentByType | undefined;
}> = [
  { source: 'equip', pick: (s) => s.equipByBuff },
  { source: 'amuleto', pick: (s) => s.amuletByBuff },
  { source: 'anel', pick: (s) => s.ringByBuff },
  { source: 'livro', pick: (s) => s.bookByBuff },
  { source: 'runa', pick: (s) => s.runeByBuff },
];

function attackStatContributes(buffType: ItemBuffTypeId, scalingStat?: string): boolean {
  if (buffType === ItemBuffType.Strength) return true;
  return scalingStat === MoveScalingStat.CRIT && buffType === ItemBuffType.Critical;
}

function defenseStatContributes(buffType: ItemBuffTypeId | 'damage_reduction'): boolean {
  return buffType === ItemBuffType.Defense || buffType === 'damage_reduction';
}

function characterStatBase(classStat: number, allocatedFlat?: number): number {
  return Math.max(0, Math.floor(classStat)) + Math.max(0, Math.floor(allocatedFlat ?? 0));
}

function allocateByWeight(weights: readonly number[], total: number): number[] {
  const sumW = weights.reduce((sum, w) => sum + w, 0);
  if (total <= 0 || sumW <= 0) return weights.map(() => 0);
  const exact = weights.map((w) => (w / sumW) * total);
  const floors = exact.map((x) => Math.floor(x));
  let remaining = total - floors.reduce((sum, n) => sum + n, 0);
  const ranked = exact
    .map((x, i) => ({ i, frac: x - Math.floor(x) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);
  const out = [...floors];
  for (const row of ranked) {
    if (remaining <= 0) break;
    out[row.i] = (out[row.i] ?? 0) + 1;
    remaining -= 1;
  }
  return out;
}

function pushFichaLine(lines: CombatBreakdownLine[], allocatedFlat?: number): void {
  const value = Math.max(0, Math.floor(allocatedFlat ?? 0));
  if (value <= 0) return;
  lines.push({
    source: 'ficha',
    percent: 0,
    value,
    includeInTotal: true,
  });
}

/** STR/DEF do SET — soma os % e aplica ceil uma vez sobre a (classe + ficha). */
function appendCharacterGearStatLines(
  lines: CombatBreakdownLine[],
  sources: CombatStatSources,
  characterBase: number,
  buffType: typeof ItemBuffType.Strength | typeof ItemBuffType.Defense,
): void {
  const rows = GEAR_BUFF_SOURCES
    .map(({ source, pick }) => ({
      source,
      percent: pick(sources)?.[buffType] ?? 0,
    }))
    .filter((row) => row.percent > 0);
  if (rows.length === 0) return;

  const totalPercent = rows.reduce((sum, row) => sum + row.percent, 0);
  const totalValue = applyCharacterGearPercent(characterBase, totalPercent);
  const values = allocateByWeight(rows.map((row) => row.percent), totalValue);

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i]!;
    lines.push({
      source: row.source,
      buffType,
      percent: row.percent,
      value: values[i] ?? 0,
      includeInTotal: true,
    });
  }
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
    if (side === 'attack' && buffType === ItemBuffType.Strength) continue;
    if (side === 'defense' && buffType === ItemBuffType.Defense) continue;

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
  const characterAtk = characterStatBase(classAttack, sources.allocatedAttackFlat);
  const lines: CombatBreakdownLine[] = [
    { source: 'ataque', percent: 0, value: classAttack, includeInTotal: true },
    { source: 'moveset', percent: 0, value: moveValue, includeInTotal: true },
  ];

  pushFichaLine(lines, sources.allocatedAttackFlat);
  // STR% do SET aplica sobre (ATK classe + ficha). O poder do move fica de fora.
  appendCharacterGearStatLines(lines, sources, characterAtk, ItemBuffType.Strength);
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
): CombatActionBreakdown {
  const classDefense = Math.max(0, Math.floor(classDef));
  const characterDef = characterStatBase(classDefense, sources.allocatedDefenseFlat);
  const lines: CombatBreakdownLine[] = [
    { source: 'classe', percent: 0, value: classDefense, includeInTotal: true },
  ];

  pushFichaLine(lines, sources.allocatedDefenseFlat);
  // DEF% do SET aplica sobre (DEF classe + ficha), não sobre o golpe recebido.
  appendCharacterGearStatLines(lines, sources, characterDef, ItemBuffType.Defense);
  appendBuffLines(lines, 'equip', sources.equipByBuff, characterDef, 'defense');
  appendBuffLines(lines, 'amuleto', sources.amuletByBuff, characterDef, 'defense');
  appendBuffLines(lines, 'anel', sources.ringByBuff, characterDef, 'defense');
  appendBuffLines(lines, 'livro', sources.bookByBuff, characterDef, 'defense');
  appendBuffLines(lines, 'runa', sources.runeByBuff, characterDef, 'defense');
  appendMarcosLines(lines, sources, classDefense, 'defense');

  return { kind: 'defense', lines };
}
