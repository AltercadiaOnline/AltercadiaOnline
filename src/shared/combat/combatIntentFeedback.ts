import type { CombatEvent } from '../events.js';
import { CombatEventType } from '../events.js';
import { exactOptionalProps } from '../util/exactOptionalProps.js';
import {
  isCombatVfxEffectType,
  resolveCombatVfxEffectType,
  type CombatVfxEffectType,
} from './combatVfxEffectTypes.js';

export type { CombatVfxEffectType } from './combatVfxEffectTypes.js';
export { isCombatVfxEffectType, resolveCombatVfxEffectType } from './combatVfxEffectTypes.js';

export type CombatActionKind = 'ATTACK' | 'SKILL' | 'DEFEND' | 'ITEM' | 'HEAL';

export type CombatImpactType = 'NORMAL' | 'HEAVY' | 'CRITICAL' | 'BLOCK' | 'HEAL';

export type CombatCameraShake = 'none' | 'low' | 'medium' | 'high';

/** Metadados de juice 2D — servidor autoriza; cliente orquestra VFX. */
export type CombatActionIntentFeedback = {
  readonly impactType: CombatImpactType;
  readonly cameraShake: CombatCameraShake;
  readonly hitStopDuration: number;
  /** Sprite do golpe (ex.: SLASH, FIREBALL). */
  readonly effectType: CombatVfxEffectType;
};

/** Corpo de `IntentResult.data` para ações de combate. */
export type CombatActionIntentResultData = {
  readonly action: CombatActionKind;
  readonly damage: number;
  readonly feedback: CombatActionIntentFeedback;
};

export function buildCombatActionIntentFeedback(
  damage: number,
  options: {
    readonly isCritical?: boolean;
    readonly blocked?: boolean;
    readonly isHeal?: boolean;
    readonly action?: CombatActionKind;
    readonly skillId?: string;
    readonly effectType?: CombatVfxEffectType;
  } = {},
): CombatActionIntentFeedback {
  const action = options.action ?? 'ATTACK';
  const effectType = resolveCombatVfxEffectType(action, {
    ...exactOptionalProps({
      skillId: options.skillId,
      effectType: options.effectType,
      isHeal: options.isHeal,
    }),
    blocked: options.blocked || damage <= 0,
  });

  if (options.isHeal) {
    return {
      impactType: 'HEAL',
      cameraShake: 'low',
      hitStopDuration: 0,
      effectType,
    };
  }

  if (options.blocked || damage <= 0) {
    return {
      impactType: 'BLOCK',
      cameraShake: 'low',
      hitStopDuration: 40,
      effectType,
    };
  }

  if (options.isCritical) {
    return {
      impactType: 'CRITICAL',
      cameraShake: 'high',
      hitStopDuration: 100,
      effectType,
    };
  }

  if (damage >= 30) {
    return {
      impactType: 'HEAVY',
      cameraShake: 'medium',
      hitStopDuration: 60,
      effectType,
    };
  }

  return {
    impactType: 'NORMAL',
    cameraShake: 'low',
    hitStopDuration: 0,
    effectType,
  };
}

export function buildCombatActionIntentResultData(
  action: CombatActionKind,
  damage: number,
  feedback: CombatActionIntentFeedback,
): CombatActionIntentResultData {
  return { action, damage, feedback };
}

export function buildCombatActionIntentResultFromDamageEvent(
  event: Extract<CombatEvent, { type: CombatEventType.DAMAGE_DEALT }>,
): CombatActionIntentResultData {
  const { amount, isCritical, defenseBreakdown, skillId } = event.payload;
  const blocked = amount <= 0 && Boolean(defenseBreakdown);
  const action: CombatActionKind = skillId ? 'SKILL' : 'ATTACK';

  return buildCombatActionIntentResultData(
    action,
    amount,
    buildCombatActionIntentFeedback(amount, exactOptionalProps({
      isCritical,
      blocked,
      action,
      skillId,
    })),
  );
}

export function extractCombatActionIntentResult(
  events: readonly CombatEvent[],
): CombatActionIntentResultData | undefined {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index];
    if (event?.type === CombatEventType.HEAL_APPLIED) {
      return buildCombatActionIntentResultData(
        'HEAL',
        event.payload.amount,
        buildCombatActionIntentFeedback(event.payload.amount, {
          isHeal: true,
          action: 'HEAL',
        }),
      );
    }
    if (event?.type === CombatEventType.DAMAGE_DEALT) {
      return buildCombatActionIntentResultFromDamageEvent(event);
    }
  }
  return undefined;
}

export function isCombatActionIntentFeedback(value: unknown): value is CombatActionIntentFeedback {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  const impactOk = record.impactType === 'NORMAL'
    || record.impactType === 'HEAVY'
    || record.impactType === 'CRITICAL'
    || record.impactType === 'BLOCK'
    || record.impactType === 'HEAL';
  const shakeOk = record.cameraShake === 'none'
    || record.cameraShake === 'low'
    || record.cameraShake === 'medium'
    || record.cameraShake === 'high';
  const effectOk = record.effectType === undefined || isCombatVfxEffectType(record.effectType);

  return impactOk
    && shakeOk
    && effectOk
    && typeof record.hitStopDuration === 'number'
    && Number.isFinite(record.hitStopDuration)
    && record.hitStopDuration >= 0;
}

export function resolveFeedbackEffectType(
  feedback: CombatActionIntentFeedback,
  action: CombatActionKind,
  skillId?: string,
): CombatVfxEffectType {
  if (feedback.effectType) return feedback.effectType;
  return resolveCombatVfxEffectType(action, exactOptionalProps({ skillId }));
}

export function isCombatActionIntentResultData(value: unknown): value is CombatActionIntentResultData {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  const actionOk = record.action === 'ATTACK'
    || record.action === 'SKILL'
    || record.action === 'DEFEND'
    || record.action === 'ITEM'
    || record.action === 'HEAL';
  return actionOk
    && typeof record.damage === 'number'
    && Number.isFinite(record.damage)
    && isCombatActionIntentFeedback(record.feedback);
}
