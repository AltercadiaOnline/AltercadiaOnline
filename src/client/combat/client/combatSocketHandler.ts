import type { CombatDispatchPayload } from '../../../shared/combatWire.js';
import { isCombatDispatchPayload } from '../../../shared/combatWire.js';

/** Contrato mínimo do socket (Socket.io, WebSocket wrapper, etc.). */
export type CombatSocket = {
  on(event: 'combat-event', handler: (payload: CombatDispatchPayload) => void): void;
  on(event: string, handler: (...args: unknown[]) => void): void;
};

export type CombatHudBridge = {
  /** Pipeline único — atualiza lastDispatch, eventos e snapshot. */
  handleCombatDispatch(payload: CombatDispatchPayload): void;
};

/**
 * Handler robusto para o canal de eventos de combate.
 * Integra o motor V1.2 mantendo a consistência do pipeline de renderização.
 */
export function createCombatSocketHandler(
  bridge: CombatHudBridge,
): (raw: unknown) => void {
  return (raw: unknown) => {
    try {
      if (!isCombatDispatchPayload(raw)) {
        console.warn('[CombatWS] Payload inválido — esperado { events, state, ui }:', raw);
        return;
      }

      const payload: CombatDispatchPayload = raw;
      console.debug('[CombatWS] Evento recebido:', payload);
      bridge.handleCombatDispatch(payload);
    } catch (error) {
      console.error('[CombatWS] Erro ao processar payload V1.2:', error);
    }
  };
}

export function attachCombatSocketListener(
  socket: CombatSocket,
  bridge: CombatHudBridge,
): void {
  socket.on('combat-event', createCombatSocketHandler(bridge));
}

/** Adapta GameClient ao contrato do socket handler. */
export function gameClientCombatBridge(gameClient: {
  handleCombatDispatch(payload: CombatDispatchPayload): void;
}): CombatHudBridge {
  return {
    handleCombatDispatch: (payload) => gameClient.handleCombatDispatch(payload),
  };
}
