import type { CombatEvent } from '../events.js';
import { CombatEventType } from '../events.js';
import { MONSTER_ATTACK_WINDUP_MS, MONSTER_REACTION_STAGGER_MS } from './CombatConfig.js';
import {
  COMBAT_DAMAGE_EVENT_GAP_MS,
  COMBAT_EVENT_GAP_MS,
  COMBAT_HIT_ANIM_MS,
  COMBAT_HIT_IMPACT_HOLD_MS,
  COMBAT_HP_ANIM_MS,
  COMBAT_INSTANT_EVENT_GAP_MS,
} from './combatSequenceConstants.js';

/**
 * Estima tempo de reprodução da fila de eventos no cliente.
 * O servidor adiciona esse grace ao deadline para preservar ~10s de escolha após as animações.
 */
function estimateDamageDealtPlaybackMs(_precededBySkillUsed: boolean): number {
  return COMBAT_HIT_ANIM_MS
    + COMBAT_HIT_ANIM_MS
    + COMBAT_HIT_IMPACT_HOLD_MS
    + COMBAT_HP_ANIM_MS
    + COMBAT_DAMAGE_EVENT_GAP_MS;
}

export function estimateCombatPlaybackMs(
  events: readonly CombatEvent[],
  playerActorId?: string,
): number {
  let total = 0;
  for (let index = 0; index < events.length; index += 1) {
    const event = events[index];
    if (!event) continue;
    switch (event.type) {
      case CombatEventType.SKILL_USED:
        break;
      case CombatEventType.DAMAGE_DEALT: {
        const previous = index > 0 ? events[index - 1] : undefined;
        const precededBySkillUsed = previous?.type === CombatEventType.SKILL_USED;
        total += estimateDamageDealtPlaybackMs(precededBySkillUsed);
        break;
      }
      case CombatEventType.COMBAT_LOG:
      case CombatEventType.ACTION_ACCEPTED:
      case CombatEventType.TURN_ORDER_RESOLVED:
      case CombatEventType.TURN_RESOLVED:
        total += COMBAT_EVENT_GAP_MS;
        break;
      default:
        total += COMBAT_INSTANT_EVENT_GAP_MS;
        break;
    }
  }

  if (playerActorId) {
    let sawPlayerDamage = false;
    let addedMonsterStagger = false;
    for (const event of events) {
      if (
        event.type === CombatEventType.DAMAGE_DEALT
        && event.payload.sourceId === playerActorId
        && event.payload.amount > 0
      ) {
        sawPlayerDamage = true;
        continue;
      }
      if (!sawPlayerDamage || addedMonsterStagger) continue;

      const isMonsterAction = event.type === CombatEventType.SKILL_USED
        && event.payload.actorId !== playerActorId
        && event.payload.actorId.startsWith('enemy_');
      const isMonsterDamage = event.type === CombatEventType.DAMAGE_DEALT
        && event.payload.sourceId !== playerActorId
        && event.payload.sourceId.startsWith('enemy_');

      if (isMonsterAction || isMonsterDamage) {
        total += MONSTER_REACTION_STAGGER_MS + MONSTER_ATTACK_WINDUP_MS;
        addedMonsterStagger = true;
      }
    }
  }


  return total;
}
