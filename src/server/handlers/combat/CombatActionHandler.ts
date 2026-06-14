import { exactOptionalProps } from '../../../shared/util/exactOptionalProps.js';
import {
  buildCombatActionIntentFeedback,
  buildCombatActionIntentResultData,
  type CombatActionKind,
} from '../../../shared/combat/combatIntentFeedback.js';
import type { CombatVfxEffectType } from '../../../shared/combat/combatVfxEffectTypes.js';
import { buildCombatActionRedirectResponse } from '../../../shared/combat/combatActionResponse.js';
import { BaseIntentHandler } from '../../network/BaseIntentHandler.js';

export type CombatActionIntentPayload = {
  readonly action?: CombatActionKind;
  readonly damage?: number;
  readonly isCritical?: boolean;
  readonly skillId?: string;
  readonly effectType?: CombatVfxEffectType;
};

function resolvePayload(payload: CombatActionIntentPayload): CombatActionIntentPayload {
  return payload ?? {};
}

/**
 * Combate principal via `combat-action` / `combat-event`.
 * Quando invocado por player-intent com `action`+`damage`, ecoa IntentResult no formato juice 2D.
 */
export class CombatActionHandler extends BaseIntentHandler<CombatActionIntentPayload> {
  readonly actionType = 'COMBAT_ACTION';

  async execute(
    playerId: string,
    payload: CombatActionIntentPayload,
    intentId: string,
  ): Promise<void> {
    const resolved = resolvePayload(payload);
    const action = resolved.action;
    const damage = resolved.damage;

    if (!action || damage === undefined) {
      this.sendResponse(playerId, intentId, false, buildCombatActionRedirectResponse());
      return;
    }

    const feedback = buildCombatActionIntentFeedback(damage, exactOptionalProps({
      isCritical: resolved.isCritical,
      action,
      skillId: resolved.skillId,
      effectType: resolved.effectType,
    }));

    this.sendResponse(
      playerId,
      intentId,
      true,
      buildCombatActionIntentResultData(action, damage, feedback),
    );
  }
}
