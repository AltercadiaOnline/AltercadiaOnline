import type { CombatActionBreakdown } from './combatActionBreakdown.js';
import {
  formatCombatHitSummary,
  sumBreakdownLines,
  type CombatHitSummaryInput,
} from './combatActionBreakdown.js';

export type CombatHitLogFormulaInput = {
  readonly damageReceived: number;
  readonly attackBreakdown?: CombatActionBreakdown;
  readonly defenseBreakdown?: CombatActionBreakdown;
  readonly attackTotal?: number;
  readonly defenseTotal?: number;
};

/**
 * Uma linha compacta para o BATTLE_LOG — espelha o popup de impacto (golpe − defesa → dano).
 * Ex.: `↳ Golpe 14 − Defesa 6 → 8`
 */
export function formatCombatHitLogFormula(input: CombatHitLogFormulaInput): string | null {
  if (!input.attackBreakdown && !input.defenseBreakdown) return null;

  const hitInput = {
    damageReceived: input.damageReceived,
    ...(input.attackBreakdown ? { attackBreakdown: input.attackBreakdown } : {}),
    ...(input.defenseBreakdown ? { defenseBreakdown: input.defenseBreakdown } : {}),
    ...(input.attackTotal !== undefined ? { attackTotal: input.attackTotal } : {}),
    ...(input.defenseTotal !== undefined ? { defenseTotal: input.defenseTotal } : {}),
  } satisfies CombatHitSummaryInput;

  const atk =
    input.attackTotal
    ?? (input.attackBreakdown ? sumBreakdownLines(input.attackBreakdown) : undefined);
  const def =
    input.defenseTotal
    ?? (input.defenseBreakdown ? sumBreakdownLines(input.defenseBreakdown) : undefined);
  const dmg = Math.max(0, Math.round(input.damageReceived));

  if (atk !== undefined && def !== undefined) {
    return `↳ Golpe ${Math.round(atk)} − Defesa ${Math.round(def)} → ${dmg}`;
  }

  const summary = formatCombatHitSummary(hitInput);
  if (summary.resultLine) {
    const compact = summary.resultLine
      .replace(/^Golpe /, '↳ Golpe ')
      .replace(/ → Dano recebido = /, ' → ');
    if (compact !== summary.resultLine) return compact;
  }

  if (atk !== undefined) return `↳ Golpe ${Math.round(atk)} → ${dmg}`;
  if (def !== undefined) return `↳ Defesa ${Math.round(def)} → ${dmg}`;

  return null;
}
