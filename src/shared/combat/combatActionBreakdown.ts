/** Linha de decomposição exibida na HUD de batalha (espelho autoritativo). */

import { type ItemBuffTypeId } from '../items/itemTypes.js';

import {

  COMBAT_BREAKDOWN_SOURCE_LABELS,

  ITEM_BUFF_COMBAT_LABELS,

  type CombatBreakdownSourceId,

} from './combatBuffSnapshot.js';



export type CombatBreakdownStatKind = ItemBuffTypeId | 'damage_reduction';



export type CombatBreakdownLine = {

  readonly source: CombatBreakdownSourceId;

  readonly buffType?: ItemBuffTypeId;

  readonly statKind?: CombatBreakdownStatKind;

  /** % do catálogo (ex.: 5 = +5%). */

  readonly percent: number;

  /** Valor inteiro que entra na soma do golpe/defesa quando `includeInTotal`. */

  readonly value: number;

  readonly includeInTotal?: boolean;

};



export type CombatActionBreakdown = {

  readonly kind: 'attack' | 'defense';

  readonly lines: readonly CombatBreakdownLine[];

};



function resolveLineStatLabel(line: CombatBreakdownLine): string {

  if (line.statKind === 'damage_reduction') return 'Redução';

  if (line.buffType) return ITEM_BUFF_COMBAT_LABELS[line.buffType];

  return '';

}



export function resolveCombatBreakdownLineLabel(line: CombatBreakdownLine): string {

  const source = COMBAT_BREAKDOWN_SOURCE_LABELS[line.source];

  const stat = resolveLineStatLabel(line);

  if (line.source === 'moveset') return 'Moveset';

  if (line.source === 'classe') return 'Defesa';

  if (!stat) return source;

  return `${source} ${stat}`;

}



function lineCountsInTotal(line: CombatBreakdownLine): boolean {

  return line.includeInTotal !== false;

}



function isPrimaryLine(line: CombatBreakdownLine): boolean {

  return line.source === 'moveset' || line.source === 'classe';

}



/** Linhas visíveis — toda a build com % > 0; base do moveset/classe sempre. */

export function getDisplayBreakdownLines(breakdown: CombatActionBreakdown): readonly CombatBreakdownLine[] {

  return breakdown.lines.filter(

    (line) => isPrimaryLine(line) || (line.percent ?? 0) > 0 || line.value !== 0,

  );

}



export function formatCombatBreakdownLine(line: CombatBreakdownLine): string {

  if (isPrimaryLine(line)) {

    return `${resolveCombatBreakdownLineLabel(line)}: ${Math.round(line.value)}`;

  }

  const pct = Math.round(line.percent);

  if (lineCountsInTotal(line) && line.value !== 0) {

    return `${resolveCombatBreakdownLineLabel(line)}: +${pct}% (+${Math.round(line.value)})`;

  }

  return `${resolveCombatBreakdownLineLabel(line)}: +${pct}%`;

}



/** Texto compacto — Moveset: 12 | Equip Força: +5% (+2) | Equip Velocidade: +3% */

export function formatCombatActionBreakdown(breakdown: CombatActionBreakdown): string {

  const visible = getDisplayBreakdownLines(breakdown);

  if (visible.length === 0) {

    return breakdown.kind === 'attack' ? 'Moveset: 0' : 'Defesa: 0';

  }

  return visible.map((line) => formatCombatBreakdownLine(line)).join(' | ');

}



function formatEquationTerm(line: CombatBreakdownLine, isFirst: boolean): string {

  if (line.source === 'moveset' || line.source === 'classe') {

    const label = line.source === 'moveset' ? 'Moveset' : 'Defesa';

    return isFirst ? `${label} ${Math.round(line.value)}` : `${label} +${Math.round(line.value)}`;

  }



  const source = COMBAT_BREAKDOWN_SOURCE_LABELS[line.source];

  const stat = resolveLineStatLabel(line);

  const pct = Math.round(line.percent);

  const chunk = stat ? `${source} +${pct} ${stat}` : `${source} +${pct}`;



  if (isFirst) return chunk;

  return chunk;

}



/** Linhas que entram na conta do golpe/defesa. */
export function getSumBreakdownLines(breakdown: CombatActionBreakdown): readonly CombatBreakdownLine[] {
  return getDisplayBreakdownLines(breakdown).filter((line) => lineCountsInTotal(line));
}

function formatRosterTerm(line: CombatBreakdownLine): string {
  if (isPrimaryLine(line)) {
    return `${resolveCombatBreakdownLineLabel(line)} ${Math.round(line.value)}`;
  }
  const source = COMBAT_BREAKDOWN_SOURCE_LABELS[line.source];
  const stat = resolveLineStatLabel(line);
  const pct = Math.round(line.percent);
  return stat ? `${source} +${pct} ${stat}` : `${source} +${pct}`;
}

/** Soma do golpe/defesa — só o que entra no total. */
export function formatCombatBreakdownSumEquation(breakdown: CombatActionBreakdown): string {
  const visible = getSumBreakdownLines(breakdown);
  if (visible.length === 0) return '';

  const terms: string[] = [];
  let total = 0;

  for (let i = 0; i < visible.length; i += 1) {
    const line = visible[i]!;
    total += Math.round(line.value);
    terms.push(formatEquationTerm(line, i === 0));
  }

  return `${terms.join(' + ')} = ${Math.round(total)}`;
}

/** Build completa — todos os buffs (% do catálogo). */
export function formatCombatBuildRoster(breakdown: CombatActionBreakdown): string {
  const visible = getDisplayBreakdownLines(breakdown);
  if (visible.length === 0) return '';
  return visible.map((line) => formatRosterTerm(line)).join(' · ');
}

/** Alias — soma mecânica. */
export function formatCombatBreakdownEquation(breakdown: CombatActionBreakdown): string {
  return formatCombatBreakdownSumEquation(breakdown);
}



export type CombatHitSummaryInput = {

  readonly attackBreakdown?: CombatActionBreakdown;

  readonly defenseBreakdown?: CombatActionBreakdown;

  readonly attackTotal?: number;

  readonly defenseTotal?: number;

  readonly damageReceived: number;

};



export function formatCombatHitSummary(input: CombatHitSummaryInput): {

  readonly attackSumEquation?: string;

  readonly attackBuildRoster?: string;

  readonly defenseSumEquation?: string;

  readonly defenseBuildRoster?: string;

  readonly resultLine: string;

} {

  const attackTotal = input.attackTotal ?? (

    input.attackBreakdown ? sumBreakdownLines(input.attackBreakdown) : undefined

  );

  const defenseTotal = input.defenseTotal ?? (

    input.defenseBreakdown ? sumBreakdownLines(input.defenseBreakdown) : undefined

  );



  const attackSumEquation = input.attackBreakdown

    ? formatCombatBreakdownSumEquation(input.attackBreakdown)

    : undefined;

  const attackBuildRoster = input.attackBreakdown

    ? formatCombatBuildRoster(input.attackBreakdown)

    : undefined;

  const defenseSumEquation = input.defenseBreakdown

    ? formatCombatBreakdownSumEquation(input.defenseBreakdown)

    : undefined;

  const defenseBuildRoster = input.defenseBreakdown

    ? formatCombatBuildRoster(input.defenseBreakdown)

    : undefined;



  const damage = Math.max(0, Math.round(input.damageReceived));

  let resultLine = `Dano recebido = ${damage}`;



  if (attackTotal !== undefined && defenseTotal !== undefined) {

    const baseNet = Math.max(0, Math.round(attackTotal) - Math.round(defenseTotal));

    resultLine = `Golpe ${Math.round(attackTotal)} − Defesa ${Math.round(defenseTotal)} → Dano recebido = ${damage}`;

    if (damage > 0 && baseNet !== damage) {

      resultLine += ' (crítico ou efeito)';

    }

  } else if (attackTotal !== undefined) {

    resultLine = `Golpe ${Math.round(attackTotal)} → Dano recebido = ${damage}`;

  } else if (defenseTotal !== undefined) {

    resultLine = `Defesa ${Math.round(defenseTotal)} → Dano recebido = ${damage}`;

  }



  return {

    ...(attackSumEquation ? { attackSumEquation } : {}),

    ...(attackBuildRoster ? { attackBuildRoster } : {}),

    ...(defenseSumEquation ? { defenseSumEquation } : {}),

    ...(defenseBuildRoster ? { defenseBuildRoster } : {}),

    resultLine,

  };

}



export function sumBreakdownLines(breakdown: CombatActionBreakdown): number {

  return breakdown.lines.reduce(

    (sum, line) => sum + (line.includeInTotal === false ? 0 : line.value),

    0,

  );

}


