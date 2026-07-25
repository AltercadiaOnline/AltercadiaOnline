// @ts-nocheck
import { buildGatewayIntentAction } from '../../shared/intent/intentProtocol.js';
import { bootstrapIntentHandlers } from '../handlers/bootstrapHandlers.js';
import { runRegisteredIntentHandler } from './intentOrchestrator.js';
/** @deprecated Use bootstrapIntentHandlers from handlers/bootstrapHandlers.js */
export function bootstrapTransactionHandlers() {
    bootstrapIntentHandlers();
}
export async function dispatchTransactionIntent(type, action) {
    bootstrapIntentHandlers();
    return runRegisteredIntentHandler(type, buildGatewayIntentAction(type, action));
}
export async function handleHealAtNpcIntent(request) {
    const result = await dispatchTransactionIntent('HEAL_AT_NPC', {
        playerId: request.playerId,
        characterId: request.characterId,
        intentId: request.intentId,
        payload: {
            npcId: request.npcId,
            ...(request.clientVitals ? { clientVitals: request.clientVitals } : {}),
            ...(request.clientMapId ? { clientMapId: request.clientMapId } : {}),
            ...(request.clientPosition ? { clientPosition: request.clientPosition } : {}),
        },
    });
    if (result.status === 'SUCCESS')
        return { ok: true };
    return { ok: false, message: result.message ?? 'Falha ao curar no NPC.' };
}
export async function handlePurchaseNpcItemIntent(request) {
    return dispatchTransactionIntent('PURCHASE_NPC_ITEM', {
        playerId: request.playerId,
        characterId: request.characterId,
        intentId: request.intentId,
        payload: {
            vendorId: request.vendorId,
            itemId: request.itemId,
            quantity: request.quantity,
        },
    });
}
export async function handleSellNpcItemIntent(request) {
    return dispatchTransactionIntent('SELL_NPC_ITEM', {
        playerId: request.playerId,
        characterId: request.characterId,
        intentId: request.intentId,
        payload: {
            vendorId: request.vendorId,
            itemId: request.itemId,
            quantity: request.quantity,
        },
    });
}
