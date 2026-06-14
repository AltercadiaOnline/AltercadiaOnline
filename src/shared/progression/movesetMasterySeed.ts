import {
  belongsToClass,
  getClassMovePool,
  isClassMoveId,
  type ClassMoveId,
} from '../combat/classMovesetCatalog.js';
import { CLASS_CATALOG, type ClassType } from '../types/classes.js';

/** XP inicial de domínio para moves da classe (demo / bootstrap). */
export const DEFAULT_MOVESET_MASTERY_XP = 25;

const CLASS_IDS = Object.keys(CLASS_CATALOG) as ClassType[];

/**
 * Garante XP base nos moves do pool que ainda não têm entrada persistida.
 * Não altera valores já gravados (inclui progresso pós-batalha).
 */
export function ensureMovesetMasteryForPool(
  mastery: Readonly<Record<string, number>>,
  poolMoveIds: readonly string[],
): Record<string, number> {
  const next: Record<string, number> = { ...mastery };
  for (const moveId of poolMoveIds) {
    if (next[moveId] === undefined) {
      next[moveId] = DEFAULT_MOVESET_MASTERY_XP;
    }
  }
  return next;
}

export function ensureMovesetMasteryForClass(
  mastery: Readonly<Record<string, number>>,
  classId: ClassType,
): Record<string, number> {
  return ensureMovesetMasteryForPool(mastery, getClassMovePool(classId));
}

/** Infere a classe a partir dos moveIds presentes no domínio persistido. */
export function inferClassIdFromMovesetMastery(
  mastery: Readonly<Record<string, number>>,
): ClassType | null {
  const moveIds = Object.keys(mastery);
  if (moveIds.length === 0) return null;

  let best: ClassType | null = null;
  let bestScore = 0;

  for (const classId of CLASS_IDS) {
    const score = moveIds.filter((id): id is ClassMoveId =>
      isClassMoveId(id) && belongsToClass(id, classId),
    ).length;
    if (score > bestScore) {
      bestScore = score;
      best = classId;
    }
  }

  return bestScore > 0 ? best : null;
}

/** Pool de moves para snapshot/HUD — classe inferida ou chaves já persistidas. */
export function resolveClassMovePoolForMastery(
  mastery: Readonly<Record<string, number>>,
  classId?: ClassType | null,
): readonly string[] {
  const resolvedClass = classId ?? inferClassIdFromMovesetMastery(mastery);
  if (resolvedClass) return getClassMovePool(resolvedClass);
  return Object.keys(mastery);
}
