import { getClassMoveById, isClassMoveId } from './classMovesetCatalog.js';
import { getMonsterSkillById } from './monsterSkillCatalog.js';
import type { SkillData } from '../types.js';

export function skillUsesPpBudget(skill: SkillData): boolean {
  return skill.ppMax !== undefined && skill.ppMax > 0;
}

export function resolveSkillPpCurrent(skill: SkillData): number {
  if (!skillUsesPpBudget(skill)) return 1;
  if (skill.ppCurrent !== undefined) return skill.ppCurrent;
  return skill.ppMax ?? 0;
}

export function resolveSkillPpMax(skill: SkillData): number {
  if (!skillUsesPpBudget(skill)) return 0;
  return skill.ppMax ?? skill.cooldown;
}

export function resolveSkillCooldownTurns(skill: SkillData): number {
  return skill.cooldownTurnsRemaining ?? 0;
}

/** Hard gate — cliente e servidor devem concordar antes de emitir/aceitar a ação. */
export function canExecuteMove(skill: SkillData, _currentTurn: number): boolean {
  if (skillUsesPpBudget(skill) && resolveSkillPpCurrent(skill) <= 0) return false;
  const remaining = resolveSkillCooldownTurns(skill);
  if (remaining > 0) return false;
  return true;
}

export function computeCooldownUntilTurn(currentTurn: number, cooldownTurns: number): number {
  if (cooldownTurns <= 0) return currentTurn;
  return currentTurn + cooldownTurns;
}

export function computeCooldownTurnsRemaining(currentTurn: number, cooldownUntilTurn: number | undefined): number {
  if (cooldownUntilTurn === undefined) return 0;
  return Math.max(0, cooldownUntilTurn - currentTurn);
}

export function resolveMoveCooldownFromCatalog(skillId: string): number {
  if (isClassMoveId(skillId)) {
    return getClassMoveById(skillId).combat?.cooldown ?? 0;
  }
  return getMonsterSkillById(skillId)?.cooldown ?? 0;
}
