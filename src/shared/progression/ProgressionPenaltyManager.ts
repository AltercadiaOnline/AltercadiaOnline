/** Snapshot de progressão sujeito a penalidade de morte. */
export type PlayerProgressionPenaltyInput = {
  readonly level: number;
  readonly xpCurrent: number;
  readonly equippedMovesetIds: readonly string[];
  readonly movesetMastery: Readonly<Record<string, number>>;
  readonly milestoneTotalProgress: number;
};

export type PlayerProgressionPenaltyResult = {
  readonly level: number;
  readonly xpCurrent: number;
  readonly movesetMastery: Readonly<Record<string, number>>;
  readonly milestoneTotalProgress: number;
};

export const DEATH_PENALTY_MIN_LEVEL = 10;
export const DEATH_PENALTY_XP_LOSS_RATIO = 0.2;
export const DEATH_PENALTY_MASTERY_LOSS_RATIO = 0.05;
export const DEATH_PENALTY_MILESTONE_LOSS_RATIO = 0.05;

export const DEATH_PENALTY_ALERT_MESSAGE =
  'Você foi derrotado. O progresso foi perdido permanentemente.';

export type DeathPenaltyOutcome = {
  readonly applied: boolean;
  readonly skippedReason?: string;
  readonly player: PlayerProgressionPenaltyResult;
  readonly xpRemoved: number;
  readonly masteryRemoved: Readonly<Record<string, number>>;
  readonly milestoneProgressRemoved: number;
};

function clampProgress(value: number): number {
  return Math.min(100, Math.max(0, value));
}

function roundProgress(value: number): number {
  return Math.round(clampProgress(value) * 100) / 100;
}

function roundMastery(value: number): number {
  return Math.round(Math.max(0, value) * 100) / 100;
}

function applyRatioLoss(current: number, lossRatio: number): number {
  const safe = Math.max(0, current);
  return roundProgress(safe * (1 - lossRatio));
}

function applyMasteryRatioLoss(current: number, lossRatio: number): number {
  const safe = Math.max(0, current);
  return roundMastery(safe * (1 - lossRatio));
}

/** Penalidade permanente — sem buffer de recuperação. */
export function applyDeathPenalty(player: PlayerProgressionPenaltyInput): DeathPenaltyOutcome {
  const baseResult: PlayerProgressionPenaltyResult = {
    level: player.level,
    xpCurrent: player.xpCurrent,
    movesetMastery: { ...player.movesetMastery },
    milestoneTotalProgress: player.milestoneTotalProgress,
  };

  if (player.level <= DEATH_PENALTY_MIN_LEVEL) {
    return {
      applied: false,
      skippedReason: `Proteção de tutorial — nível ${player.level} ≤ ${DEATH_PENALTY_MIN_LEVEL}.`,
      player: baseResult,
      xpRemoved: 0,
      masteryRemoved: {},
      milestoneProgressRemoved: 0,
    };
  }

  const xpRemoved = Math.floor(Math.max(0, player.xpCurrent) * DEATH_PENALTY_XP_LOSS_RATIO);
  const nextXp = Math.max(0, player.xpCurrent - xpRemoved);

  const masteryRemoved: Record<string, number> = {};
  const nextMastery: Record<string, number> = { ...player.movesetMastery };

  for (const movesetId of player.equippedMovesetIds) {
    const before = nextMastery[movesetId] ?? 0;
    const after = applyMasteryRatioLoss(before, DEATH_PENALTY_MASTERY_LOSS_RATIO);
    masteryRemoved[movesetId] = roundMastery(before - after);
    nextMastery[movesetId] = after;
  }

  const milestoneBefore = clampProgress(player.milestoneTotalProgress);
  const milestoneAfter = applyRatioLoss(milestoneBefore, DEATH_PENALTY_MILESTONE_LOSS_RATIO);
  const milestoneProgressRemoved = roundProgress(milestoneBefore - milestoneAfter);

  return {
    applied: true,
    player: {
      level: player.level,
      xpCurrent: nextXp,
      movesetMastery: nextMastery,
      milestoneTotalProgress: milestoneAfter,
    },
    xpRemoved,
    masteryRemoved,
    milestoneProgressRemoved,
  };
}
