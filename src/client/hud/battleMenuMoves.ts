// @ts-nocheck
import { canExecuteMove, resolveSkillCooldownTurns, resolveSkillPpCurrent, resolveSkillPpMax, skillUsesPpBudget, } from '../../shared/combat/skillRuntime.js';
export function skillsToMenuMoves(skills, currentTurn) {
    return skills.map((skill) => ({
        id: skill.id,
        name: skill.name,
        ppCurrent: skillUsesPpBudget(skill) ? resolveSkillPpCurrent(skill) : resolveSkillPpMax(skill) || 0,
        ppMax: skillUsesPpBudget(skill) ? resolveSkillPpMax(skill) : 0,
        cooldownTurnsRemaining: resolveSkillCooldownTurns(skill),
        executable: canExecuteMove(skill, currentTurn),
    }));
}
