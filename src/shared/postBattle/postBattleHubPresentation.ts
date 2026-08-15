import type { BattleEndReason } from '../combat/battleEnded.js';
import {
  BattleType,
  formatBattleRankingSummary,
  type BattleRankingResult,
} from '../combat/battleType.js';
import type { DeathPenaltyOutcome } from '../progression/ProgressionPenaltyManager.js';
import { formatDeathPenaltySummaryLines } from '../progression/deathPenaltySummary.js';
import type { PostBattleHubSummary } from '../types/postBattleHub.js';

export function resolvePostBattleTitleText(summary: PostBattleHubSummary): string {
  if (summary.victory) return summary.battleType === BattleType.PVP ? 'Vitória no duelo' : 'Vitória';
  if (summary.endReason === 'FORFEIT') return 'Rendição';
  return summary.battleType === BattleType.PVP ? 'Derrota no duelo' : 'Derrota';
}

export function resolvePostBattleSubtitleText(summary: PostBattleHubSummary): string {
  if (summary.battleType === BattleType.PVP) {
    return 'Duelo encerrado. O chat da arena permanece ativo — interaja antes de sair.';
  }
  if (summary.victory) {
    return 'Batalha encerrada. Veja estatísticas ou abra Recompensas (vitória PVE).';
  }
  if (summary.endReason === 'FORFEIT') {
    return 'Você fugiu. O monstro continua no mapa.';
  }
  return summary.deathPenaltyLines && summary.deathPenaltyLines.length > 0
    ? 'Confira o que foi perdido antes de voltar ao mapa.'
    : 'Batalha encerrada. Você voltará à cidade segura.';
}

export function resolvePostBattleRankingLabel(summary: PostBattleHubSummary): string {
  return summary.victory ? 'Pontos ganhos' : 'Resultado do ranking';
}

export function resolvePostBattleRankingText(summary: PostBattleHubSummary): string {
  return formatBattleRankingSummary(summary.rankingResult);
}

export function shouldShowPostBattleRewardsSlot(summary: PostBattleHubSummary): boolean {
  return summary.battleType !== BattleType.PVP && summary.victory;
}

export function shouldShowPostBattleDeathPenalty(summary: PostBattleHubSummary): boolean {
  return (
    summary.battleType !== BattleType.PVP
    && !summary.victory
    && summary.endReason !== 'FORFEIT'
    && Boolean(summary.deathPenaltyLines && summary.deathPenaltyLines.length > 0)
  );
}

export function isPostBattlePvp(summary: PostBattleHubSummary): boolean {
  return summary.battleType === BattleType.PVP;
}

/** Monta summary a partir do payload de vitória UI (bridge React). */
export function buildPostBattleHubSummary(input: {
  readonly battleType: BattleType;
  readonly victory: boolean;
  readonly xpGain?: number;
  readonly endReason?: BattleEndReason;
  readonly rankingResult?: BattleRankingResult;
  readonly deathPenaltyOutcome?: DeathPenaltyOutcome;
}): PostBattleHubSummary {
  const deathPenaltyLines =
    !input.victory && input.endReason !== 'FORFEIT' && input.battleType !== BattleType.PVP
      ? formatDeathPenaltySummaryLines(input.deathPenaltyOutcome)
      : undefined;

  return {
    battleType: input.battleType,
    victory: input.victory,
    ...(input.xpGain !== undefined ? { xpGain: input.xpGain } : {}),
    ...(input.endReason !== undefined ? { endReason: input.endReason } : {}),
    ...(input.rankingResult !== undefined ? { rankingResult: input.rankingResult } : {}),
    ...(deathPenaltyLines !== undefined ? { deathPenaltyLines } : {}),
  };
}
