import type { SkillData } from '../types.js';
import type { CombatClassId } from '../types.js';
import { ACTIVE_MOVESET_SLOT_COUNT, PLAYER_MOVE_POOL_SIZE, type MoveDefinition } from './moveTypes.js';
import { monsterSkillToSkillData, getMonsterSkillById } from './monsterSkillCatalog.js';
import {
  CLASS_ACTIVE_LOADOUT_SIZE,
  CLASS_HEAL_MOVE_ID,
  getClassMoveById,
  getClassMovePool,
  isClassMoveId,
} from './classMovesetCatalog.js';
import { resolveMoveDefinitionForUi } from './resolveMoveCombatMeta.js';
import { CLASS_DEFAULT_ACTIVE_LOADOUT } from './moveGameplayRole.js';
import { applyMoveMasteryToSkillData } from '../progression/moveCombatScaling.js';

export { resolveMoveDefinitionForUi };

/** Quatro skills padrão — mix burst / ramp / DoT / setup (ver `CLASS_DEFAULT_ACTIVE_LOADOUT`). */
export function getDefaultClassActiveLoadout(classId: CombatClassId): string[] {
  const curated = CLASS_DEFAULT_ACTIVE_LOADOUT[classId];
  const pool = getClassMovePool(classId);
  if (
    curated.length === CLASS_ACTIVE_LOADOUT_SIZE
    && curated.every((id) => isClassMoveId(id) && pool.includes(id))
  ) {
    return [...curated];
  }
  return [...pool.slice(0, CLASS_ACTIVE_LOADOUT_SIZE)];
}

export function skillIdToSkillData(moveId: string): SkillData {
  if (isClassMoveId(moveId)) {
    return moveIdToSkillData(moveId);
  }
  if (getMonsterSkillById(moveId)) {
    return monsterSkillToSkillData(moveId);
  }
  throw new Error(`[Moveset] Movimento desconhecido: ${moveId}`);
}

export function moveIdToSkillData(
  moveId: string,
  totalMasteryXp = 0,
): SkillData {
  if (isClassMoveId(moveId)) {
    const move = getClassMoveById(moveId);
    const combat = move.combat;
    if (!combat || !move.isDefined) {
      throw new Error(`[Moveset] Movimento de classe sem stats definidos: ${moveId}`);
    }
    const skill: SkillData = {
      id: move.id,
      name: move.name,
      damage: combat.basePower,
      basePower: combat.basePower,
      cooldown: combat.cooldown,
      priority: combat.priority,
      ppCurrent: combat.basePp,
      ppMax: combat.basePp,
      target: combat.target,
      category: combat.category,
      scalingStat: combat.scalingStat,
      effectKind: move.effectKind,
    };
    const withParams = combat.effectParams
      ? { ...skill, effectParams: combat.effectParams }
      : skill;
    return totalMasteryXp > 0
      ? applyMoveMasteryToSkillData(withParams, totalMasteryXp)
      : withParams;
  }

  if (getMonsterSkillById(moveId)) {
    return monsterSkillToSkillData(moveId);
  }

  throw new Error(`[Moveset] Movimento desconhecido: ${moveId}`);
}

export function moveIdsToSkillData(
  moveIds: readonly string[],
  masteryByMoveId: Readonly<Record<string, number>> = {},
): SkillData[] {
  return moveIds.map((moveId) => {
    const masteryXp = masteryByMoveId[moveId] ?? 0;
    if (isClassMoveId(moveId)) {
      return moveIdToSkillData(moveId, masteryXp);
    }
    return skillIdToSkillData(moveId);
  });
}

/** Valida 4 IDs únicos contra um pool explícito (ex.: `getClassMovePool`). */
export function isValidActiveLoadout(moveIds: readonly string[], pool: readonly string[]): boolean {
  if (moveIds.length !== ACTIVE_MOVESET_SLOT_COUNT) return false;
  if (moveIds.length !== new Set(moveIds).size) return false;
  return moveIds.every((id) => pool.includes(id));
}

export function normalizeActiveLoadout(moveIds: readonly string[], pool: readonly string[]): string[] | null {
  if (!isValidActiveLoadout(moveIds, pool)) return null;
  return [...moveIds];
}

/**
 * Regras oficiais de classe:
 * - loadout ativo com 4 skills únicas
 * - todas pertencem ao pool de 6 da classe
 * - no máximo 1 move de cura canônico da classe no ativo
 */
export function isValidClassActiveLoadout(classId: CombatClassId, moveIds: readonly string[]): boolean {
  if (moveIds.length !== CLASS_ACTIVE_LOADOUT_SIZE) return false;
  if (moveIds.length !== new Set(moveIds).size) return false;
  const pool = getClassMovePool(classId);
  if (!moveIds.every((id) => pool.includes(id as (typeof pool)[number]))) return false;
  const healMoveId = CLASS_HEAL_MOVE_ID[classId];
  if (!healMoveId) return true;
  const healCount = moveIds.filter((id) => id === healMoveId).length;
  return healCount <= 1;
}

export function normalizeClassActiveLoadout(
  classId: CombatClassId,
  moveIds: readonly string[],
): string[] | null {
  if (!isValidClassActiveLoadout(classId, moveIds)) return null;
  return [...moveIds];
}

/** Mesma regra do servidor (buildPveBattle): 4 moves válidos ou padrão da classe. */
export function resolvePlayerEquippedSkillIds(
  classId: CombatClassId,
  equippedSkillIds: readonly string[],
): string[] {
  return (
    normalizeClassActiveLoadout(classId, equippedSkillIds)
    ?? getDefaultClassActiveLoadout(classId)
  );
}

export { ACTIVE_MOVESET_SLOT_COUNT, PLAYER_MOVE_POOL_SIZE };
