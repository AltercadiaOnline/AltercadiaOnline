// @ts-nocheck
import { getMoveTargetType, MoveTargetType } from './battleTargeting.js';
export function pickOpponentActorId(actorId, combatants, preferredEnemyId) {
    if (preferredEnemyId && preferredEnemyId !== actorId && preferredEnemyId in combatants) {
        return preferredEnemyId;
    }
    for (const id of Object.keys(combatants)) {
        if (id !== actorId)
            return id;
    }
    return null;
}
/** Resolve targetId quando a UI não pede seleção explícita (PvE 1v1, self-buff, etc.). */
export function resolveTargetIdForSkill(skillId, actorId, combatants, preferredEnemyId) {
    const targetType = getMoveTargetType(skillId);
    switch (targetType) {
        case MoveTargetType.Self:
        case MoveTargetType.Tile:
            return actorId;
        case MoveTargetType.Enemy:
            return pickOpponentActorId(actorId, combatants, preferredEnemyId);
        default:
            return pickOpponentActorId(actorId, combatants, preferredEnemyId);
    }
}
export function buildSkillActionRequest(params) {
    return {
        battleId: params.battleId,
        actorId: params.actorId,
        skillId: params.skillId,
        targetId: params.targetId,
        turn: params.turn,
        requestId: params.requestId ?? `client-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    };
}
export function buildSkillActionFromState(state, actorId, skillId, targetId, preferredEnemyId) {
    const resolvedTarget = targetId
        ?? resolveTargetIdForSkill(skillId, actorId, state.combatants, preferredEnemyId);
    if (!resolvedTarget)
        return null;
    return buildSkillActionRequest({
        battleId: state.battleId,
        actorId,
        skillId,
        targetId: resolvedTarget,
        turn: state.turn,
    });
}
export function isValidActionTarget(request, combatants) {
    if (!request.skillId)
        return true;
    const targetId = request.targetId;
    if (!targetId || !(targetId in combatants))
        return false;
    const targetType = getMoveTargetType(request.skillId);
    if (targetType === MoveTargetType.Self && targetId !== request.actorId)
        return false;
    if (targetType === MoveTargetType.Enemy && targetId === request.actorId)
        return false;
    return true;
}
