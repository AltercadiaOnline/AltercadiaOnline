import type { BattleEndReason } from '../combat/battleEnded.js';
import {
  BattleType,
  formatBattleRankingSummary,
  type BattleRankingResult,
} from '../combat/battleType.js';
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
  return summary.victory
    ? 'Batalha encerrada. Veja estatísticas ou abra Recompensas (vitória PVE).'
    : 'Batalha encerrada.';
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
}): PostBattleHubSummary {
  return {
    battleType: input.battleType,
    victory: input.victory,
    ...(input.xpGain !== undefined ? { xpGain: input.xpGain } : {}),
    ...(input.endReason !== undefined ? { endReason: input.endReason } : {}),
    ...(input.rankingResult !== undefined ? { rankingResult: input.rankingResult } : {}),
  };
}
