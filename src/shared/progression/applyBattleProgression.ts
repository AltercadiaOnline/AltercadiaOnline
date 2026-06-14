import { applyCharacterXpGain } from '../character/characterLevelProgression.js';
import type { BattleProgressionGrant } from './battleProgressionGrant.js';
import { applyMoveMasteryXpGain } from './moveMasteryCap.js';

export type BattleProgressionPlayerState = {
  readonly level: number;
  readonly xpCurrent: number;
  readonly movesetMastery: Readonly<Record<string, number>>;
  readonly milestoneTotalProgress: number;
};

export type AppliedBattleProgression = BattleProgressionPlayerState & {
  readonly playerLevelUps: number;
  readonly movesetXpApplied: Readonly<Record<string, number>>;
  /** Moves que receberam grant mas ficaram no teto de domínio do char. */
  readonly movesetMasteryCapBlocked: readonly string[];
};

function clampMilestoneProgress(value: number): number {
  return Math.min(100, Math.max(0, value));
}

/**
 * Aplica grant de vitória PVE — nível, domínio de moveset e progresso meta.
 * XP de personagem usa `applyCharacterXpGain` (fonte PVE aqui; outras fontes usam o mesmo helper).
 */
export function applyBattleProgressionGrant(
  player: BattleProgressionPlayerState,
  grant: BattleProgressionGrant,
): AppliedBattleProgression {
  const levelResult = applyCharacterXpGain(
    { level: player.level, xpCurrent: player.xpCurrent },
    grant.levelXp,
  );

  const nextMastery: Record<string, number> = { ...player.movesetMastery };
  const movesetXpApplied: Record<string, number> = {};
  const movesetMasteryCapBlocked: string[] = [];

  for (const [moveId, gained] of Object.entries(grant.movesetXpByMoveId)) {
    if (gained <= 0) continue;
    const before = nextMastery[moveId] ?? 0;
    const capped = applyMoveMasteryXpGain(before, gained, levelResult.level);
    nextMastery[moveId] = capped.after;
    if (capped.applied > 0) {
      movesetXpApplied[moveId] = capped.applied;
    } else {
      movesetMasteryCapBlocked.push(moveId);
    }
  }

  const milestoneTotalProgress = clampMilestoneProgress(
    player.milestoneTotalProgress + grant.milestoneProgressGain,
  );

  return {
    level: levelResult.level,
    xpCurrent: levelResult.xpCurrent,
    movesetMastery: nextMastery,
    milestoneTotalProgress,
    playerLevelUps: levelResult.levelsGained,
    movesetXpApplied,
    movesetMasteryCapBlocked,
  };
}
