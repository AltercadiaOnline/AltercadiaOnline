import type { CombatStatSources } from '../types.js';
import type { CombatantSpeedProfile } from '../types.js';
import { ItemBuffType } from '../items/itemTypes.js';
import {
  COMBAT_BREAKDOWN_SOURCE_LABELS,
  ITEM_BUFF_COMBAT_LABELS,
  type BuffPercentByType,
} from './combatBuffSnapshot.js';
import { COMBAT_INITIATIVE_STAT_LABEL } from '../stats/statDisplayLabels.js';

export { COMBAT_INITIATIVE_STAT_LABEL };

export type InitiativeSpeedLine = {
  readonly source: keyof typeof INITIATIVE_SPEED_SOURCE_LABELS;
  readonly flat: number;
  readonly percent?: number;
  readonly includeInTotal: boolean;
};

export const INITIATIVE_SPEED_SOURCE_LABELS = {
  fluxo: 'Fluxo',
  classe: 'Classe',
  equip: 'Equip',
  amuleto: 'Amuleto',
  anel: 'Anel',
  marcos: 'Marcos',
  runa: 'Runa',
  buff: 'Buff',
  pocao: 'Poção',
  exaustao: 'Exaustão',
} as const;

export type InitiativeSpeedDisplayInput = {
  readonly profile: CombatantSpeedProfile;
  readonly sources?: CombatStatSources;
  readonly potionSpeedBuff?: number;
  readonly speedAttributePercent?: number;
};

function rosterFromAgilityBuffs(map: BuffPercentByType | undefined, source: 'equip' | 'amuleto' | 'anel'): string[] {
  if (!map) return [];
  const pct = map[ItemBuffType.Agility] ?? 0;
  if (pct <= 0) return [];
  const label = COMBAT_BREAKDOWN_SOURCE_LABELS[source];
  return [`${label} +${Math.round(pct)} ${COMBAT_INITIATIVE_STAT_LABEL}`];
}

export function buildInitiativeSpeedLines(input: InitiativeSpeedDisplayInput): readonly InitiativeSpeedLine[] {
  const p = input.profile;
  const lines: InitiativeSpeedLine[] = [
    { source: 'fluxo', flat: p.flowSpeedBase ?? 0, includeInTotal: true },
    { source: 'classe', flat: p.classSpeedBias ?? 0, includeInTotal: true },
    { source: 'equip', flat: p.equipSpeedFlat ?? 0, includeInTotal: true },
    { source: 'marcos', flat: p.marcoSpeedFlat ?? 0, includeInTotal: true },
    { source: 'buff', flat: p.buffSpeedFlat ?? 0, includeInTotal: true },
    { source: 'runa', flat: p.runeSpeedFlatConditional ?? 0, includeInTotal: true },
  ];

  const potion = input.potionSpeedBuff ?? 0;
  if (potion !== 0) {
    lines.push({ source: 'pocao', flat: potion, includeInTotal: true });
  }

  const exhaustion = p.potionExhaustionPenalty ?? 0;
  if (exhaustion !== 0) {
    lines.push({ source: 'exaustao', flat: exhaustion, includeInTotal: true });
  }

  return lines.filter((line) => line.includeInTotal && (line.flat !== 0 || line.source === 'fluxo'));
}

export function formatInitiativeSpeedSumEquation(
  lines: readonly InitiativeSpeedLine[],
  effectiveSpeedRaw: number,
): string {
  const visible = lines.filter((l) => l.flat !== 0 || l.source === 'fluxo');
  if (visible.length === 0) return `${COMBAT_INITIATIVE_STAT_LABEL} ${Math.round(effectiveSpeedRaw)}`;

  const terms: string[] = [];
  for (let i = 0; i < visible.length; i += 1) {
    const line = visible[i]!;
    const label = INITIATIVE_SPEED_SOURCE_LABELS[line.source];
    const v = Math.round(line.flat);
    const chunk = v >= 0 ? `+${v}` : `${v}`;
    terms.push(i === 0 ? `${label} ${v}` : `${label} ${chunk}`);
  }

  return `${terms.join(' ')} = ${Math.round(effectiveSpeedRaw)}`;
}

export function formatInitiativeSpeedRoster(input: InitiativeSpeedDisplayInput): string {
  const parts: string[] = [];
  const s = input.sources;

  parts.push(...rosterFromAgilityBuffs(s?.equipByBuff, 'equip'));
  parts.push(...rosterFromAgilityBuffs(s?.amuletByBuff, 'amuleto'));
  parts.push(...rosterFromAgilityBuffs(s?.ringByBuff, 'anel'));
  const bookAgi = s?.bookByBuff?.[ItemBuffType.Agility] ?? 0;
  if (bookAgi > 0) parts.push(`Livro +${Math.round(bookAgi)} ${COMBAT_INITIATIVE_STAT_LABEL}`);
  const runeAgi = s?.runeByBuff?.[ItemBuffType.Agility] ?? 0;
  if (runeAgi > 0) parts.push(`Runa +${Math.round(runeAgi)} ${COMBAT_INITIATIVE_STAT_LABEL}`);

  const lines = buildInitiativeSpeedLines(input);
  for (const line of lines) {
    if (line.flat === 0) continue;
    const label = INITIATIVE_SPEED_SOURCE_LABELS[line.source];
    parts.push(`${label} +${Math.round(line.flat)} ${COMBAT_INITIATIVE_STAT_LABEL}`);
  }

  return [...new Set(parts)].join(' · ');
}

export function formatInitiativeSpeedDisplay(input: InitiativeSpeedDisplayInput & {
  readonly effectiveSpeedRaw: number;
  readonly speedAttributeContribution: number;
}): {
  readonly sumEquation: string;
  readonly buildRoster: string;
  readonly initiativeLine: string;
} {
  const lines = buildInitiativeSpeedLines(input);
  const sumEquation = formatInitiativeSpeedSumEquation(lines, input.effectiveSpeedRaw);
  const buildRoster = formatInitiativeSpeedRoster(input);
  const initiativeLine =
    `${COMBAT_INITIATIVE_STAT_LABEL} efetiva ${Math.round(input.effectiveSpeedRaw)}`
    + ` → Iniciativa +${Math.round(input.speedAttributeContribution)}`;

  return { sumEquation, buildRoster, initiativeLine };
}
