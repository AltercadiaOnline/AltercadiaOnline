import type { DeathPenaltyOutcome } from './ProgressionPenaltyManager.js';
import { DEATH_PENALTY_MIN_LEVEL } from './ProgressionPenaltyManager.js';

/**
 * Linhas de resumo para UI — só formata o outcome autoritativo.
 * Cliente não recalcula penalidade.
 */
export function formatDeathPenaltySummaryLines(
  outcome: DeathPenaltyOutcome | null | undefined,
): readonly string[] {
  if (!outcome) {
    return [
      'Você foi derrotado.',
      'Retorno à cidade segura.',
    ];
  }

  if (!outcome.applied) {
    const protectedByLevel =
      outcome.skippedReason?.includes(`≤ ${DEATH_PENALTY_MIN_LEVEL}`)
      || outcome.skippedReason?.toLowerCase().includes('tutorial');
    return [
      'Você foi derrotado.',
      protectedByLevel
        ? `Sem perda de progressão (proteção até o nível ${DEATH_PENALTY_MIN_LEVEL}).`
        : 'Sem perda de progressão nesta derrota.',
      'Retorno à cidade segura.',
    ];
  }

  const lines: string[] = ['Você foi derrotado.'];

  if (outcome.xpRemoved > 0) {
    lines.push(`−${outcome.xpRemoved} XP de personagem`);
  }

  if (outcome.milestoneProgressRemoved > 0) {
    lines.push(`−${outcome.milestoneProgressRemoved.toFixed(1)}% nos Marcos`);
  }

  const masteryLoss = Object.values(outcome.masteryRemoved).reduce(
    (sum, value) => sum + value,
    0,
  );
  if (masteryLoss > 0) {
    lines.push(`−${masteryLoss.toFixed(1)}% de domínio nos moves equipados`);
  }

  if (lines.length === 1) {
    lines.push('Progresso penalizado nesta derrota.');
  }

  lines.push('Retorno à cidade segura.');
  return lines;
}
