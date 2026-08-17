import {
  getSumBreakdownLines,
  resolveCombatBreakdownLineLabel,
  sumBreakdownLines,
} from './combatActionBreakdown.js';
import type { CombatActionBreakdown } from './combatActionBreakdown.js';
import type { CombatHitMitigationSnapshot } from './combatHitMitigation.js';

export type CombatHitLessonRowKind =
  | 'atk'
  | 'move'
  | 'buff'
  | 'sum'
  | 'def'
  | 'crit'
  | 'mod'
  | 'result';

export type CombatHitLessonRow = {
  readonly label: string;
  readonly display: string;
  readonly kind: CombatHitLessonRowKind;
};

export type CombatHitLessonTableInput = {
  readonly attackBreakdown?: CombatActionBreakdown;
  readonly defenseTotal?: number;
  readonly damageReceived: number;
  readonly mitigation?: CombatHitMitigationSnapshot;
};

function kindForAttackLine(source: string): CombatHitLessonRowKind {
  if (source === 'ataque') return 'atk';
  if (source === 'moveset') return 'move';
  return 'buff';
}

function formatSigned(value: number): string {
  const rounded = Math.round(value);
  if (rounded > 0) return `+${rounded}`;
  return String(rounded);
}

/**
 * Tabela autodidata do hit — só espelha o breakdown autoritativo.
 * ATK + Move + SET = Golpe − Defesa; crítico e efeitos depois.
 */
export function buildCombatHitLessonTable(
  input: CombatHitLessonTableInput,
): readonly CombatHitLessonRow[] {
  const rows: CombatHitLessonRow[] = [];
  const attackTotal = input.attackBreakdown
    ? sumBreakdownLines(input.attackBreakdown)
    : undefined;
  const defenseTotal = input.defenseTotal !== undefined
    ? Math.round(input.defenseTotal)
    : undefined;

  if (input.attackBreakdown) {
    for (const line of getSumBreakdownLines(input.attackBreakdown)) {
      const kind = kindForAttackLine(line.source);
      const value = Math.round(line.value);
      if (kind === 'buff' && value === 0) continue;
      rows.push({
        label: resolveCombatBreakdownLineLabel(line),
        display: kind === 'buff' ? formatSigned(value) : String(value),
        kind,
      });
    }
    if (attackTotal !== undefined) {
      rows.push({
        label: 'Golpe',
        display: String(Math.round(attackTotal)),
        kind: 'sum',
      });
    }
  }

  if (defenseTotal !== undefined && defenseTotal > 0) {
    rows.push({
      label: 'Defesa',
      display: `−${defenseTotal}`,
      kind: 'def',
    });
  }

  const net = attackTotal !== undefined && defenseTotal !== undefined
    ? Math.max(0, Math.round(attackTotal) - defenseTotal)
    : undefined;

  if (
    net !== undefined
    && input.mitigation
    && (input.mitigation.isCritical
      || input.mitigation.vulnerableApplied
      || (input.mitigation.shieldAbsorbed ?? 0) > 0
      || (input.mitigation.incomingReductionPercent ?? 0) > 0)
  ) {
    rows.push({
      label: 'Base',
      display: String(net),
      kind: 'sum',
    });
  }

  const mitigation = input.mitigation;
  if (mitigation?.isCritical) {
    const pct = mitigation.critBonusPercent;
    rows.push({
      label: 'Crítico',
      display: pct !== undefined && pct > 0 ? `+${Math.round(pct)}%` : 'pico',
      kind: 'crit',
    });
  }
  if (mitigation?.vulnerableApplied) {
    rows.push({
      label: 'Vulnerável',
      display: '+20%',
      kind: 'mod',
    });
  }
  if (mitigation?.shieldAbsorbed !== undefined && mitigation.shieldAbsorbed > 0) {
    rows.push({
      label: 'Escudo',
      display: `−${Math.round(mitigation.shieldAbsorbed)}`,
      kind: 'mod',
    });
  }
  if (
    mitigation?.incomingReductionPercent !== undefined
    && mitigation.incomingReductionPercent > 0
  ) {
    rows.push({
      label: 'Redução',
      display: `−${Math.round(mitigation.incomingReductionPercent)}%`,
      kind: 'mod',
    });
  }

  const damage = Math.max(0, Math.round(input.damageReceived));
  rows.push({
    label: 'Dano',
    display: damage > 0 ? `−${damage}` : '0',
    kind: 'result',
  });

  return rows;
}
