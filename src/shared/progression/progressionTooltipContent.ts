import {
  resolveCharacterLevelXpBar,
  type CharacterLevelXpBarView,
} from '../character/characterLevelProgression.js';
import type { PlayerProfileSnapshot } from '../character/playerProfile.js';
import type { PetSnapshot } from '../pet/petModel.js';
import { formatPetAffinityGainPercent, resolvePetAffinityProgress } from '../pet/petAffinity.js';
import type { MoveProgressionSnapshot } from './moveProgression.js';
import { isMoveMasteryAtMax } from './moveProgression.js';
import { resolveMarcoProgressPercent } from './marcoProgression.js';
import type { MarcoNodeView } from './milestoneTreeState.js';

export type ProgressionTooltipKind =
  | 'player-level'
  | 'pet-affinity'
  | 'move-mastery'
  | 'marco-node';

export type ProgressionTooltipPayload = {
  readonly kind: ProgressionTooltipKind;
  readonly title: string;
  readonly percent: number;
  readonly current: number;
  readonly threshold: number;
  readonly nextLabel: string;
  readonly atMax?: boolean;
};

export function resolveProgressionRemaining(current: number, threshold: number): number {
  return Math.max(0, Math.floor(threshold) - Math.floor(current));
}

export function resolveProgressionPercent(current: number, threshold: number): number {
  if (threshold <= 0) return 100;
  return Math.min(100, Math.max(0, (current / threshold) * 100));
}

/** Linha principal — ex.: "12% · +3.52% na próxima ração". */
export function formatProgressionTooltipLine(payload: ProgressionTooltipPayload): string {
  if (payload.atMax || payload.threshold <= 0) {
    return 'Progressão máxima alcançada.';
  }

  if (payload.kind === 'pet-affinity') {
    const pct = Math.floor(payload.percent * 10) / 10;
    return `${pct}% · ${payload.nextLabel}`;
  }

  const remaining = resolveProgressionRemaining(payload.current, payload.threshold);
  const pct = Math.floor(payload.percent);
  const xp = remaining.toLocaleString('pt-BR');
  return `${pct}% · faltam ${xp} XP para ${payload.nextLabel}`;
}

export function buildProgressionTooltipLines(payload: ProgressionTooltipPayload): readonly string[] {
  return [formatProgressionTooltipLine(payload)];
}

export function buildPlayerLevelProgressionTooltip(
  profile: PlayerProfileSnapshot,
  barView?: CharacterLevelXpBarView,
): ProgressionTooltipPayload {
  const bar = barView ?? resolveCharacterLevelXpBar(profile.level, profile.xpCurrent);
  return {
    kind: 'player-level',
    title: 'Experiência',
    percent: bar.percent,
    current: bar.xpCurrent,
    threshold: bar.xpToNext,
    nextLabel: `nível ${bar.level + 1}`,
  };
}

export function buildPetAffinityProgressionTooltip(pet: PetSnapshot): ProgressionTooltipPayload {
  const affinity = resolvePetAffinityProgress(pet);
  const atMax = affinity.ratio >= 1;

  return {
    kind: 'pet-affinity',
    title: 'Afinidade',
    percent: affinity.ratio * 100,
    current: affinity.displayPercent,
    threshold: 100,
    nextLabel: atMax
      ? 'máximo de afinidade'
      : `+${formatPetAffinityGainPercent(affinity.nextFeedGain)}% na próxima ração`,
    atMax,
  };
}

export function buildMoveMasteryProgressionTooltip(
  moveId: string,
  progression: MoveProgressionSnapshot,
  moveName?: string,
): ProgressionTooltipPayload {
  const cappedForChar =
    'masteryCappedForCharLevel' in progression && progression.masteryCappedForCharLevel === true;
  const atAbsoluteMax = isMoveMasteryAtMax(progression);
  const atMax = atAbsoluteMax || cappedForChar;
  const percent = atMax
    ? 100
    : resolveProgressionPercent(progression.xp, progression.nextLevelThreshold);

  let nextLabel = `nível ${progression.level + 1}`;
  if (cappedForChar) {
    nextLabel = 'MAX para nível atual';
  } else if (atAbsoluteMax) {
    nextLabel = 'domínio máximo';
  }

  return {
    kind: 'move-mastery',
    title: moveName ?? moveId,
    percent,
    current: progression.xp,
    threshold: progression.nextLevelThreshold,
    nextLabel,
    atMax,
  };
}

export function buildMarcoNodeProgressionTooltip(nodeView: MarcoNodeView): ProgressionTooltipPayload {
  const atMax = nodeView.nextLevelThreshold <= 0;
  const percent = resolveMarcoProgressPercent(
    nodeView.progressionXp,
    nodeView.nextLevelThreshold,
  );

  return {
    kind: 'marco-node',
    title: nodeView.def.name,
    percent,
    current: nodeView.progressionXp,
    threshold: nodeView.nextLevelThreshold,
    nextLabel: `nível ${nodeView.progressionLevel + 1}`,
    atMax,
  };
}
