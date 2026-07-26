import {
  getBookDefinition,
  getEquipableItem,
  getRuneDefinition,
} from '../items/itemCatalog.js';
import { ItemBuffType } from '../items/itemTypes.js';
import type { EquippedSlots } from './equipmentState.js';
import { computePlayerHpMax, PLAYER_HP_PER_LEVEL, resolvePlayerBaseHpForLevel } from './playerVitals.js';

/** Uma fonte de bônus de vida — sempre percentual sobre a base. */
export type PlayerHpBonusLine = {
  readonly sourceLabel: string;
  readonly percent: number;
};

export type PlayerHpBonusBreakdown = {
  readonly baseHp: number;
  readonly totalBonusPercent: number;
  readonly hpMax: number;
  readonly lines: readonly PlayerHpBonusLine[];
};

function sumHpPercentFromBuffs(
  buffs: readonly { readonly type: string; readonly percent: number }[] | undefined,
): number {
  if (!buffs) return 0;
  let total = 0;
  for (const buff of buffs) {
    if (buff.type === ItemBuffType.Hp && buff.percent > 0) {
      total += buff.percent;
    }
  }
  return total;
}

function pushLine(
  lines: PlayerHpBonusLine[],
  sourceLabel: string,
  percent: number,
): void {
  if (percent <= 0) return;
  lines.push({ sourceLabel, percent });
}

/**
 * Quebra o bônus de vida do SET (e runa/livro) em linhas % nomeadas.
 * Fórmula canônica: `floor(BASE × (1 + Σ% / 100))` — nunca soma flat no teto.
 */
export function resolvePlayerHpBonusBreakdownFromEquipped(
  equipped: EquippedSlots,
  level = 1,
): PlayerHpBonusBreakdown {
  const lines: PlayerHpBonusLine[] = [];

  const armorSlots = [
    equipped.head,
    equipped.top,
    equipped.bottom,
  ] as const;

  for (const itemId of armorSlots) {
    if (typeof itemId !== 'string' || !itemId) continue;
    const item = getEquipableItem(itemId);
    if (!item) continue;
    pushLine(lines, item.name, sumHpPercentFromBuffs(item.buffs));
  }

  if (typeof equipped.amulet === 'string' && equipped.amulet) {
    const item = getEquipableItem(equipped.amulet);
    if (item) pushLine(lines, item.name, sumHpPercentFromBuffs(item.buffs));
  }

  if (typeof equipped.ring === 'string' && equipped.ring) {
    const item = getEquipableItem(equipped.ring);
    if (item) pushLine(lines, item.name, sumHpPercentFromBuffs(item.buffs));
  }

  if (typeof equipped.rune === 'string' && equipped.rune) {
    const rune = getRuneDefinition(equipped.rune);
    if (rune) {
      pushLine(lines, rune.name, sumHpPercentFromBuffs(rune.passiveBuffs));
    }
  }

  if (typeof equipped.book === 'string' && equipped.book) {
    const book = getBookDefinition(equipped.book);
    if (book) {
      pushLine(lines, book.name, sumHpPercentFromBuffs(book.passiveBuffs));
    }
  }

  const totalBonusPercent = lines.reduce((sum, line) => sum + line.percent, 0);
  const baseHp = resolvePlayerBaseHpForLevel(level);
  return {
    baseHp,
    totalBonusPercent,
    hpMax: computePlayerHpMax(level, totalBonusPercent),
    lines,
  };
}

/** Linhas de tooltip — hover na barra/valor de vida. */
export function formatPlayerHpBonusTooltipLines(
  breakdown: PlayerHpBonusBreakdown,
): readonly string[] {
  const out: string[] = [`Base: ${breakdown.baseHp} HP`];

  if (breakdown.lines.length === 0) {
    out.push('Sem bônus de vida ativos.');
    return out;
  }

  for (const line of breakdown.lines) {
    out.push(`+${line.percent}% — ${line.sourceLabel}`);
  }

  out.push(`Total: +${breakdown.totalBonusPercent}% → ${breakdown.hpMax} HP máx.`);
  return out;
}
