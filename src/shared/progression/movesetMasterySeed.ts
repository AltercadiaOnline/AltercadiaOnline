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

export function isClassType(value: unknown): value is ClassType {
  return typeof value === 'string' && (CLASS_IDS as readonly string[]).includes(value);
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

/**
 * Classe da identidade (hub) → save → domínio.
 * Não inventa IMPETUS: retorna null quando nada disso existe.
 */
export function resolveIdentityBackedClassId(
  hubClassId: unknown,
  storedClassId: unknown,
  mastery: Readonly<Record<string, number>>,
): ClassType | null {
  if (isClassType(hubClassId)) return hubClassId;
  if (isClassType(storedClassId)) return storedClassId;
  return inferClassIdFromMovesetMastery(mastery);
}

/**
 * Classe autoritativa do personagem.
 * Ordem: perfil persistido → inferência do domínio → IMPETUS (só combate legado vazio).
 */
export function resolveAuthoritativeClassId(
  storedClassId: ClassType | string | null | undefined,
  mastery: Readonly<Record<string, number>>,
): ClassType {
  return resolveIdentityBackedClassId(undefined, storedClassId, mastery) ?? 'IMPETUS';
}

export type ReconciledClassProgression = {
  readonly classId: ClassType;
  readonly movesetMastery: Record<string, number>;
  /** True quando o perfil ainda não tinha `classId` gravado. */
  readonly classIdWasMissing: boolean;
  /** True quando o domínio recebeu seeds novos do pool da classe. */
  readonly masteryWasPatched: boolean;
  /** True quando a classe saiu só do fallback IMPETUS — não gravar no save. */
  readonly inventedFallback: boolean;
};

/**
 * Garante o elo player → classe → moveset:
 * resolve a classe, preenche domínio vazio do pool e reporta se precisa persistir.
 * `hubClassId` (slot) manda sobre o save — identidade não se re-infere.
 */
export function reconcileClassAndMovesetMastery(
  storedClassId: ClassType | string | null | undefined,
  mastery: Readonly<Record<string, number>>,
  hubClassId?: unknown,
): ReconciledClassProgression {
  const classIdWasMissing = !isClassType(storedClassId);
  const identityClass = resolveIdentityBackedClassId(hubClassId, storedClassId, mastery);
  const inventedFallback = identityClass === null;
  const classId = identityClass ?? 'IMPETUS';
  const movesetMastery = inventedFallback
    ? { ...mastery }
    : ensureMovesetMasteryForClass(mastery, classId);
  const masteryWasPatched =
    !inventedFallback
    && (
      Object.keys(movesetMastery).length !== Object.keys(mastery).length
      || Object.keys(movesetMastery).some((id) => mastery[id] === undefined)
    );

  return { classId, movesetMastery, classIdWasMissing, masteryWasPatched, inventedFallback };
}

/** Pool de moves para snapshot/HUD — classe persistida/inferida ou chaves já gravadas. */
export function resolveClassMovePoolForMastery(
  mastery: Readonly<Record<string, number>>,
  classId?: ClassType | null,
): readonly string[] {
  const resolvedClass = resolveAuthoritativeClassId(classId, mastery);
  return getClassMovePool(resolvedClass);
}
