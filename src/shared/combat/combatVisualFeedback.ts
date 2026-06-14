import type { CombatEvent } from '../events.js';
import { CombatEventType } from '../events.js';
import {
  MONSTER_ATTACK_WINDUP_MS,
  MONSTER_REACTION_STAGGER_MS,
} from './CombatConfig.js';
import {
  COMBAT_ATTACK_WINDUP_MS,
  COMBAT_DAMAGE_EVENT_GAP_MS,
  COMBAT_HIT_ANIM_BLOCK_MS,
  COMBAT_HIT_ANIM_LOG_CAP_MS,
  COMBAT_HIT_ANIM_MS,
  COMBAT_HIT_IMPACT_HOLD_MS,
  COMBAT_HP_ANIM_MS,
  COMBAT_INSTANT_EVENT_GAP_MS,
  COMBAT_STATUS_PORTRAIT_FAST_MS,
  COMBAT_STATUS_PORTRAIT_MS,
} from './combatSequenceConstants.js';

export type CombatFeedbackCue = 'attack' | 'hit' | 'heal' | 'shield' | 'rune';

export type CombatFeedbackStep =
  | { readonly kind: 'portrait_stance'; readonly combatantId: string; readonly stance: 'idle' | 'attack' }
  | { readonly kind: 'portrait_cue'; readonly combatantId: string; readonly cue: CombatFeedbackCue }
  | {
      readonly kind: 'damage_impact';
      readonly sourceId: string;
      readonly targetId: string;
      readonly amount: number;
      readonly skillId?: string;
      readonly skillName?: string;
      readonly hasTechnical: boolean;
    }
  | { readonly kind: 'hp_animate'; readonly combatantId: string; readonly hpAfter: number }
  | { readonly kind: 'heal_pop'; readonly combatantId: string; readonly amount: number }
  | { readonly kind: 'wait'; readonly ms: number };

export type CombatFeedbackSegment = {
  /** Índice do CombatEvent correspondente em `CombatDispatchPayload.events`. */
  readonly eventIndex: number;
  readonly steps: readonly CombatFeedbackStep[];
};

/** Script visual autoritativo — cliente apenas reproduz. */
export type CombatVisualFeedback = {
  readonly segments: readonly CombatFeedbackSegment[];
  readonly estimatedMs: number;
};

export function buildEmptyCombatVisualFeedback(): CombatVisualFeedback {
  return { segments: [], estimatedMs: 0 };
}

function estimateStepMs(step: CombatFeedbackStep): number {
  switch (step.kind) {
    case 'portrait_stance':
      return 0;
    case 'portrait_cue':
      return COMBAT_HIT_ANIM_MS;
    case 'damage_impact':
      return COMBAT_HIT_ANIM_MS;
    case 'hp_animate':
      return COMBAT_HP_ANIM_MS;
    case 'heal_pop':
      return COMBAT_HIT_ANIM_MS;
    case 'wait':
      return step.ms;
    default:
      return 0;
  }
}

function estimateSegmentMs(segment: CombatFeedbackSegment): number {
  return segment.steps.reduce((sum, step) => sum + estimateStepMs(step), 0);
}

export function estimateCombatVisualFeedbackMs(feedback: CombatVisualFeedback): number {
  return feedback.segments.reduce((sum, segment) => sum + estimateSegmentMs(segment), 0);
}

function buildDamageDealtSteps(
  event: Extract<CombatEvent, { type: CombatEventType.DAMAGE_DEALT }>,
  precededBySkillUsed: boolean,
): CombatFeedbackStep[] {
  const { sourceId, targetId, amount, hpAfter, skillId, skillName, attackBreakdown, defenseBreakdown } =
    event.payload;
  const steps: CombatFeedbackStep[] = [];

  if (!precededBySkillUsed) {
    steps.push({ kind: 'portrait_stance', combatantId: sourceId, stance: 'attack' });
  }

  steps.push({ kind: 'portrait_cue', combatantId: sourceId, cue: 'attack' });
  steps.push({
    kind: 'damage_impact',
    sourceId,
    targetId,
    amount,
    ...(skillId ? { skillId } : {}),
    ...(skillName ? { skillName } : {}),
    hasTechnical: Boolean(attackBreakdown || defenseBreakdown || amount >= 0),
  });

  if (amount > 0) {
    steps.push({ kind: 'portrait_cue', combatantId: targetId, cue: 'hit' });
  } else if (defenseBreakdown) {
    steps.push({ kind: 'portrait_cue', combatantId: targetId, cue: 'shield' });
  } else {
    steps.push({ kind: 'wait', ms: Math.min(COMBAT_HIT_ANIM_MS, COMBAT_HIT_ANIM_BLOCK_MS) });
  }

  steps.push({ kind: 'wait', ms: COMBAT_HIT_IMPACT_HOLD_MS });
  steps.push({ kind: 'hp_animate', combatantId: targetId, hpAfter });
  steps.push({ kind: 'portrait_stance', combatantId: sourceId, stance: 'idle' });

  return steps;
}

export type BuildCombatVisualFeedbackOptions = {
  readonly playerActorId?: string;
  readonly enemyActorIds?: readonly string[];
};

function resolveEnemyActorIds(
  options?: BuildCombatVisualFeedbackOptions,
): ReadonlySet<string> | null {
  if (options?.enemyActorIds) {
    return new Set(options.enemyActorIds);
  }
  return null;
}

function isLikelyEnemyActor(actorId: string): boolean {
  return actorId.startsWith('enemy_');
}

function isEnemyActor(actorId: string, enemyIds: ReadonlySet<string> | null): boolean {
  if (enemyIds?.has(actorId)) return true;
  return isLikelyEnemyActor(actorId);
}

function shouldInsertMonsterReactionStagger(
  events: readonly CombatEvent[],
  index: number,
  playerActorId: string | undefined,
  enemyIds: ReadonlySet<string> | null,
): boolean {
  if (!playerActorId) return false;

  const event = events[index];
  if (!event) return false;

  let sawPlayerDamage = false;
  for (let i = 0; i < index; i += 1) {
    const prior = events[i];
    if (
      prior?.type === CombatEventType.DAMAGE_DEALT
      && prior.payload.sourceId === playerActorId
      && prior.payload.amount > 0
    ) {
      sawPlayerDamage = true;
      break;
    }
  }
  if (!sawPlayerDamage) return false;

  if (event.type === CombatEventType.SKILL_USED) {
    return isEnemyActor(event.payload.actorId, enemyIds);
  }
  if (event.type === CombatEventType.DAMAGE_DEALT) {
    return isEnemyActor(event.payload.sourceId, enemyIds);
  }
  return false;
}

function buildSegmentForEvent(
  event: CombatEvent,
  eventIndex: number,
  events: readonly CombatEvent[],
  enemyIds: ReadonlySet<string> | null,
): CombatFeedbackSegment | null {
  switch (event.type) {
    case CombatEventType.SKILL_USED: {
      const isMonsterWindUp = isEnemyActor(event.payload.actorId, enemyIds);
      const steps: CombatFeedbackStep[] = isMonsterWindUp
        ? [
            { kind: 'portrait_stance', combatantId: event.payload.actorId, stance: 'attack' },
            { kind: 'wait', ms: MONSTER_ATTACK_WINDUP_MS },
          ]
        : [
            { kind: 'portrait_stance', combatantId: event.payload.actorId, stance: 'attack' },
          ];
      return { eventIndex, steps };
    }

    case CombatEventType.DAMAGE_DEALT: {
      const previous = eventIndex > 0 ? events[eventIndex - 1] : undefined;
      const precededBySkillUsed = previous?.type === CombatEventType.SKILL_USED;
      return {
        eventIndex,
        steps: buildDamageDealtSteps(event, precededBySkillUsed),
      };
    }

    case CombatEventType.HEAL_APPLIED:
      return {
        eventIndex,
        steps: [
          { kind: 'portrait_cue', combatantId: event.payload.targetId, cue: 'heal' },
          {
            kind: 'heal_pop',
            combatantId: event.payload.targetId,
            amount: event.payload.amount,
          },
          {
            kind: 'hp_animate',
            combatantId: event.payload.targetId,
            hpAfter: event.payload.hpAfter,
          },
        ],
      };

    case CombatEventType.SHIELD_APPLIED:
      return {
        eventIndex,
        steps: [{ kind: 'portrait_cue', combatantId: event.payload.actorId, cue: 'shield' }],
      };

    case CombatEventType.RUNE_TRIGGERED:
      return {
        eventIndex,
        steps: [{ kind: 'portrait_cue', combatantId: event.payload.actorId, cue: 'rune' }],
      };

    case CombatEventType.CONSUMABLE_USED:
      return {
        eventIndex,
        steps: [{ kind: 'portrait_cue', combatantId: event.payload.actorId, cue: 'heal' }],
      };

    case CombatEventType.STATUS_EVENT:
      return {
        eventIndex,
        steps: [
          {
            kind: 'wait',
            ms: event.payload.phase === 'applied' && event.payload.statusId.includes('offensive')
              ? COMBAT_STATUS_PORTRAIT_FAST_MS
              : COMBAT_STATUS_PORTRAIT_MS,
          },
        ],
      };

    case CombatEventType.COMBAT_LOG:
      return {
        eventIndex,
        steps: [{ kind: 'wait', ms: Math.min(COMBAT_HIT_ANIM_MS, COMBAT_HIT_ANIM_LOG_CAP_MS) }],
      };

    default:
      return {
        eventIndex,
        steps: [{ kind: 'wait', ms: COMBAT_INSTANT_EVENT_GAP_MS }],
      };
  }
}

/** Deriva o roteiro visual 2D a partir dos eventos autoritativos. */
export function buildCombatVisualFeedback(
  events: readonly CombatEvent[],
  options?: BuildCombatVisualFeedbackOptions,
): CombatVisualFeedback {
  const segments: CombatFeedbackSegment[] = [];
  const enemyIds = resolveEnemyActorIds(options);
  let insertedMonsterStagger = false;

  for (let index = 0; index < events.length; index += 1) {
    const event = events[index];
    if (!event) continue;

    if (
      event.type === CombatEventType.BATTLE_START
      || event.type === CombatEventType.BATTLE_STATE_UPDATE
      || event.type === CombatEventType.TURN_START
      || event.type === CombatEventType.ACTION_ACCEPTED
      || event.type === CombatEventType.ACTION_REJECTED
      || event.type === CombatEventType.SKILL_CATALOG
      || event.type === CombatEventType.PP_CHANGED
      || event.type === CombatEventType.COOLDOWN_UPDATED
      || event.type === CombatEventType.TURN_RESOLVED
      || event.type === CombatEventType.TURN_ORDER_RESOLVED
      || event.type === CombatEventType.COMBAT_FINISHED
      || event.type === CombatEventType.STATUS_APPLIED
      || event.type === CombatEventType.STATUS_EXPIRED
    ) {
      continue;
    }

    if (
      !insertedMonsterStagger
      && shouldInsertMonsterReactionStagger(events, index, options?.playerActorId, enemyIds)
    ) {
      segments.push({
        eventIndex: index,
        steps: [{ kind: 'wait', ms: MONSTER_REACTION_STAGGER_MS }],
      });
      insertedMonsterStagger = true;
    }

    const segment = buildSegmentForEvent(event, index, events, enemyIds);
    if (segment && segment.steps.length > 0) {
      segments.push(segment);
    }
  }

  let estimatedMs = estimateCombatVisualFeedbackMs({ segments, estimatedMs: 0 });
  if (segments.some((segment) => events[segment.eventIndex]?.type === CombatEventType.DAMAGE_DEALT)) {
    estimatedMs += COMBAT_DAMAGE_EVENT_GAP_MS;
  }
  if (segments.length === 0 && events.some((event) => event.type === CombatEventType.DAMAGE_DEALT)) {
    estimatedMs += COMBAT_ATTACK_WINDUP_MS;
  }

  return { segments, estimatedMs };
}
