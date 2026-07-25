// @ts-nocheck
import { CombatEventType } from '../../shared/events.js';
import { COMBAT_HIT_ANIM_MS } from '../../shared/combat/combatSequenceConstants.js';
import { CombatAnimator } from './CombatAnimator.js';
/**
 * Camada visual da fila — retratos, impactos e cues antes do consume na HUD.
 * Estado autoritativo continua vindo do servidor via HUDManager.consume.
 */
export async function playCombatEventAnimation(event, ctx) {
    switch (event.type) {
        case CombatEventType.DAMAGE_DEALT:
            await ctx.battleScreen?.playCombatExchange(event.payload.sourceId, event.payload.targetId);
            break;
        case CombatEventType.RUNE_TRIGGERED:
            await ctx.battleScreen?.playCombatCue(event.payload.actorId, 'rune');
            break;
        case CombatEventType.CONSUMABLE_USED:
            await ctx.battleScreen?.playCombatCue(event.payload.actorId, 'heal');
            break;
        case CombatEventType.COMBAT_LOG:
            await CombatAnimator.wait(Math.min(COMBAT_HIT_ANIM_MS, 200));
            break;
        default:
            break;
    }
}
