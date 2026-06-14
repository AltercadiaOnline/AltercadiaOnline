import { CharacterProgressionService } from './CharacterProgressionService.js';

/** Progressão de domínio de um movimento (moveset). */

export type MoveProgressionSnapshot = {
  readonly moveId: string;
  readonly level: number;
  readonly xp: number;
  readonly nextLevelThreshold: number;
  /** Teto de domínio para o nível atual do personagem (HUD). */
  readonly masteryCappedForCharLevel?: boolean;
  readonly masteryCapLevel?: number;
};

export type MovesProgressionData = {
  readonly byMoveId: Readonly<Record<string, MoveProgressionSnapshot>>;
};

/** Nível máximo de domínio por movimento. */
export const MOVE_MAX_LEVEL = 99;

/** @deprecated Use `PROGRESSION_XP_BASE` em CharacterProgressionService. */
export const MOVE_XP_THRESHOLD_BASE = 100;

/** +1,5% de power base por nível de domínio efetivo. */
export const MOVE_POWER_GROWTH_PER_LEVEL = 0.015;

/** +1 PP máximo a cada 10 níveis de domínio. */
export const MOVE_PP_BONUS_INTERVAL = 10;

/**
 * XP para subir do nível `level` ao próximo — mesma curva do personagem.
 */
export function getRequiredXpForLevel(level: number): number {
  return CharacterProgressionService.getRequiredXp(level);
}

/** @deprecated Prefer `getRequiredXpForLevel` — alias de compatibilidade. */
export function resolveMoveXpThresholdForLevel(level: number): number {
  return getRequiredXpForLevel(level);
}

/** XP total acumulado para estar no nível informado (nível 1 = 0). */
export function totalMasteryXpForLevel(targetLevel: number): number {
  const capped = Math.min(MOVE_MAX_LEVEL + 1, Math.max(1, Math.floor(targetLevel)));
  let total = 0;

  for (let level = 1; level < capped; level += 1) {
    total += getRequiredXpForLevel(level);
  }

  return total;
}

/** Teto de XP persistido — domínio nível 99 completo. */
export const MOVE_MAX_MASTERY_XP = totalMasteryXpForLevel(MOVE_MAX_LEVEL + 1);

export function totalMasteryXpFromSnapshot(prog: {
  readonly level: number;
  readonly xp: number;
}): number {
  let total = Math.max(0, Math.floor(prog.xp));

  for (let level = 1; level < Math.max(1, Math.floor(prog.level)); level += 1) {
    total += getRequiredXpForLevel(level);
  }

  return total;
}

/** Persistência sempre em inteiros — sem casas decimais no `movesetMastery`. */
export function clampMoveMasteryXp(totalMasteryXp: number): number {
  return Math.min(MOVE_MAX_MASTERY_XP, Math.max(0, Math.floor(totalMasteryXp)));
}

/**
 * Converte XP total de domínio (movesetMastery persistido) em level + xp parcial.
 */
export function resolveMoveProgressionFromMastery(
  moveId: string,
  totalMasteryXp: number,
): MoveProgressionSnapshot {
  let remaining = clampMoveMasteryXp(totalMasteryXp);
  let level = 1;
  let nextLevelThreshold = getRequiredXpForLevel(level);

  while (level < MOVE_MAX_LEVEL && remaining >= nextLevelThreshold) {
    remaining -= nextLevelThreshold;
    level += 1;
    nextLevelThreshold = getRequiredXpForLevel(level);
  }

  if (level >= MOVE_MAX_LEVEL) {
    remaining = 0;
    nextLevelThreshold = 0;
  }

  return {
    moveId,
    level,
    xp: remaining,
    nextLevelThreshold,
  };
}

export function isMoveMasteryAtMax(progression: MoveProgressionSnapshot): boolean {
  return progression.level >= MOVE_MAX_LEVEL || progression.nextLevelThreshold <= 0;
}

export function buildMovesProgressionData(
  masteryByMoveId: Readonly<Record<string, number>>,
  moveIds: readonly string[],
): MovesProgressionData {
  const byMoveId: Record<string, MoveProgressionSnapshot> = {};

  for (const moveId of moveIds) {
    byMoveId[moveId] = resolveMoveProgressionFromMastery(
      moveId,
      masteryByMoveId[moveId] ?? 0,
    );
  }

  return { byMoveId };
}
