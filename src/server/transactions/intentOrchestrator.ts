// @ts-nocheck
import { buildIntentFailureFromMessage, toIntentResult, } from '../../shared/intent/intentProtocol.js';
import { resolveIntentHandler, } from '../network/intentHandlerRegistry.js';
function isLegacyIntentHandler(handler) {
    return handler.execute.length >= 4;
}
/** Envia ack WS unificado — garante que o cliente nunca fique pending sem resposta. */
export function sendIntentHandlerResult(sender, result) {
    sender({
        type: 'intent-result',
        payload: toIntentResult(result),
    });
}
export function sendIntentFailure(sender, intentId, message, error) {
    sendIntentHandlerResult(sender, error
        ? { intentId, status: 'FAILURE', error, message }
        : buildIntentFailureFromMessage(intentId, message));
}
/**
 * Executa handler registrado com try/catch — falhas de negócio viram FAILURE + intentId.
 */
export async function runRegisteredIntentHandler(type, action) {
    let handler;
    try {
        handler = resolveIntentHandler(type);
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Falha ao resolver handler.';
        return buildIntentFailureFromMessage(action.intentId, message);
    }
    if (!handler) {
        return buildIntentFailureFromMessage(action.intentId, `Handler não registrado: ${type}`);
    }
    if (!isLegacyIntentHandler(handler)) {
        return buildIntentFailureFromMessage(action.intentId, `Handler ${type} requer sessão WS dedicada.`);
    }
    try {
        return await handler.execute(action.playerId, action.characterId, action.payload, action.intentId);
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Falha ao processar intenção.';
        return buildIntentFailureFromMessage(action.intentId, message);
    }
}
