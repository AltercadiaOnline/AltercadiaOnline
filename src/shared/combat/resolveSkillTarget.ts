import type { Combatant } from '../types/combat.js';
import { MoveTarget, type MoveTarget as MoveTargetType } from './classMovesetCatalog.js';
import { getCombatRole } from '../pet/petCombatRules.js';
import { resolveAttackTargetId } from './petTurnOrder.js';

export function isAlliedCombatant(
  actorId: string,
  targetId: string,
  combatants: Readonly<Record<string, Combatant>>,
): boolean {
  if (actorId === targetId) return true;
  const actor = combatants[actorId];
  const target = combatants[targetId];
  if (!actor || !target) return false;

  const actorRole = getCombatRole(actor);
  const targetRole = getCombatRole(target);
  if (actorRole === 'ENEMY' || targetRole === 'ENEMY') return false;

  if (actorRole === 'PLAYER' && targetRole === 'PET') {
    return target.ownerPlayerId === actorId;
  }
  if (actorRole === 'PET' && targetRole === 'PLAYER') {
    return actor.ownerPlayerId === targetId;
  }
  if (actorRole === 'PET' && targetRole === 'PET') {
    return actor.ownerPlayerId === target.ownerPlayerId;
  }
  return actorRole === 'PLAYER' && targetRole === 'PLAYER' && actorId === targetId;
}

export function resolveSkillTargetId(input: {
  readonly actorId: string;
  readonly requestedTargetId?: string;
  readonly moveTarget?: MoveTargetType;
  readonly combatants: Readonly<Record<string, Combatant>>;
  readonly playerActorId?: string | null;
}): string | null {
  const { actorId, moveTarget, combatants, playerActorId } = input;
  if (!combatants[actorId]) return null;

  switch (moveTarget) {
    case MoveTarget.Enemy:
    case MoveTarget.AllEnemies:
      return resolveAttackTargetId(actorId, combatants, playerActorId ?? actorId);
    case MoveTarget.AllyOrSelf: {
      if (input.requestedTargetId && isAlliedCombatant(actorId, input.requestedTargetId, combatants)) {
        return input.requestedTargetId;
      }
      return actorId;
    }
    case MoveTarget.Self:
    default:
      return actorId;
  }
}

export function moveRequiresEnemyTarget(moveTarget?: MoveTargetType): boolean {
  return moveTarget === MoveTarget.Enemy || moveTarget === MoveTarget.AllEnemies;
}

const SELF_TARGET_EFFECT_KINDS: ReadonlySet<string> = new Set([
  'SELF_SHIELD',
  'GROUP_SHIELD',
  'STATUS_IMMUNITY',
  'THORNS',
  'HEAL',
  'ATTACK_ECHO',
]);

/** Fallback quando a skill não está no catálogo (ex.: golpes genéricos de monstro). */
export function inferMoveTargetFromEffectKind(effectKind?: string): MoveTargetType {
  if (effectKind && SELF_TARGET_EFFECT_KINDS.has(effectKind)) {
    return MoveTarget.Self;
  }
  return MoveTarget.Enemy;
}
