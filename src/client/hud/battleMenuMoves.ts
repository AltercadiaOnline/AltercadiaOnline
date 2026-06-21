import type { Skill } from '../../shared/types.js';
import {
  canExecuteMove,
  resolveSkillCooldownTurns,
  resolveSkillPpCurrent,
  resolveSkillPpMax,
  skillUsesPpBudget,
} from '../../shared/combat/skillRuntime.js';

export type BattleMenuMove = {
  readonly id: string;
  readonly name: string;
  readonly ppCurrent: number;
  readonly ppMax: number;
  readonly cooldownTurnsRemaining: number;
  readonly executable: boolean;
};

export function skillsToMenuMoves(skills: readonly Skill[], currentTurn: number): BattleMenuMove[] {
  return skills.map((skill) => ({
    id: skill.id,
    name: skill.name,
    ppCurrent: skillUsesPpBudget(skill) ? resolveSkillPpCurrent(skill) : resolveSkillPpMax(skill) || 0,
    ppMax: skillUsesPpBudget(skill) ? resolveSkillPpMax(skill) : 0,
    cooldownTurnsRemaining: resolveSkillCooldownTurns(skill),
    executable: canExecuteMove(skill, currentTurn),
  }));
}
