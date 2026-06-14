import {
  clampMoveMasteryXp,
  MOVE_MAX_LEVEL,
  MOVE_MAX_MASTERY_XP,
  resolveMoveProgressionFromMastery,
  totalMasteryXpForLevel,
  type MoveProgressionSnapshot,
} from './moveProgression.js';

/** Teto de domínio: moveLevel < charLevel × fator para continuar ganhando XP. */
export const MOVE_MASTERY_CAP_FACTOR = 1.5;

/** Verifica se o move pode subir de nível ou ganhar XP de domínio. */
export function canMoveGainXp(charLevel: number, moveLevel: number): boolean {
  const safeChar = Math.max(1, Math.floor(charLevel));
  const safeMove = Math.max(1, Math.floor(moveLevel));
  if (safeMove > MOVE_MAX_LEVEL) {
    return false;
  }
  if (safeMove === MOVE_MAX_LEVEL) {
    return safeChar * MOVE_MASTERY_CAP_FACTOR >= MOVE_MAX_LEVEL;
  }
  return safeMove < safeChar * MOVE_MASTERY_CAP_FACTOR;
}

export type MoveMasteryXpApplyResult = {
  readonly after: number;
  readonly applied: number;
};

export type MoveProgressionWithCapSnapshot = MoveProgressionSnapshot & {
  readonly masteryCappedForCharLevel: boolean;
  readonly masteryCapLevel: number;
};

/** Nível máximo de domínio atingível para o nível atual do personagem. */
export function getMoveMasteryCapLevel(charLevel: number): number {
  const safeChar = Math.max(1, Math.floor(charLevel));
  let cap = 1;
  while (cap < MOVE_MAX_LEVEL && canMoveGainXp(safeChar, cap)) {
    cap += 1;
  }
  return Math.min(MOVE_MAX_LEVEL, cap);
}

/** XP total máximo persistível sem ultrapassar o teto de domínio do personagem. */
export function getMaxMasteryXpForCharLevel(charLevel: number): number {
  const capLevel = getMoveMasteryCapLevel(charLevel);
  if (capLevel >= MOVE_MAX_LEVEL) {
    return MOVE_MAX_MASTERY_XP;
  }
  return totalMasteryXpForLevel(capLevel + 1) - 1;
}

/** Move atingiu o teto de domínio para o nível atual do personagem. */
export function isMoveAtMasteryCap(moveLevel: number, charLevel: number): boolean {
  return !canMoveGainXp(charLevel, moveLevel);
}

/**
 * Aplica ganho de XP de domínio respeitando o Mastery Cap.
 * Retorna 0 de `applied` se o move já está no teto para o charLevel.
 */
export function applyMoveMasteryXpGain(
  currentMasteryXp: number,
  gained: number,
  charLevel: number,
): MoveMasteryXpApplyResult {
  const before = clampMoveMasteryXp(Math.floor(currentMasteryXp));
  const moveLevel = resolveMoveProgressionFromMastery('_', before).level;

  if (!canMoveGainXp(charLevel, moveLevel)) {
    return { after: before, applied: 0 };
  }

  const maxForChar = getMaxMasteryXpForCharLevel(charLevel);
  if (before >= maxForChar) {
    return { after: before, applied: 0 };
  }

  const gainedSafe = Math.max(0, Math.floor(gained));
  if (gainedSafe <= 0) {
    return { after: before, applied: 0 };
  }

  const after = Math.min(maxForChar, before + gainedSafe);
  return { after, applied: after - before };
}

/** Progressão de domínio com estado de teto para HUD. */
export function resolveMoveProgressionForChar(
  moveId: string,
  totalMasteryXp: number,
  charLevel: number,
): MoveProgressionWithCapSnapshot {
  const base = resolveMoveProgressionFromMastery(moveId, totalMasteryXp);
  const capLevel = getMoveMasteryCapLevel(charLevel);
  const capped = isMoveAtMasteryCap(base.level, charLevel);

  if (!capped) {
    return {
      ...base,
      masteryCappedForCharLevel: false,
      masteryCapLevel: capLevel,
    };
  }

  return {
    ...base,
    masteryCappedForCharLevel: true,
    masteryCapLevel: capLevel,
    nextLevelThreshold: 0,
    xp: 0,
  };
}
