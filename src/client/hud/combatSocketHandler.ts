// @ts-nocheck
import { isCombatDispatchPayload } from '../../shared/combatWire.js';
/**
 * Handler robusto para o canal de eventos de combate.
 * Integra o motor V1.2 mantendo a consistência do pipeline de renderização.
 */
export function createCombatSocketHandler(bridge) {
    return (raw) => {
        try {
            if (!isCombatDispatchPayload(raw)) {
                console.warn('[CombatWS] Payload inválido — esperado { events, state, ui }:', raw);
                return;
            }
            const payload = raw;
            console.debug('[CombatWS] Evento recebido:', payload);
            bridge.handleCombatDispatch(payload);
        }
        catch (error) {
            console.error('[CombatWS] Erro ao processar payload V1.2:', error);
        }
    };
}
export function attachCombatSocketListener(socket, bridge) {
    socket.on('combat-event', createCombatSocketHandler(bridge));
}
/** Adapta GameClient ao contrato do socket handler. */
export function gameClientCombatBridge(gameClient) {
    return {
        handleCombatDispatch: (payload) => gameClient.handleCombatDispatch(payload),
    };
}
