import type { CombatDispatchPayload } from '../../shared/combatWire.js';
import { isCombatDispatchPayload } from '../../shared/combatWire.js';
import type { CombatEvent } from '../../shared/events.js';
import type { CombatState } from '../../shared/types.js';

/** Contrato mínimo do socket (Socket.io, WebSocket wrapper, etc.). */
export type CombatSocket = {
  on(event: 'combat-event', handler: (payload: CombatDispatchPayload) => void): void;
  on(event: string, handler: (...args: unknown[]) => void): void;
};

import type { CombatUiHints } from '../../shared/combatWire.js';

export type CombatHudBridge = {
  consumeCombatEvents(events: readonly CombatEvent[]): void;
  renderState(state: CombatState, ui: CombatUiHints): void;
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
        console.warn('[CombatWS] Payload inválido — esperado { events, state }:', raw);
        return;
      }

      const payload: CombatDispatchPayload = raw;
      console.debug('[CombatWS] Evento recebido:', payload);

      // 1. Processamento atomizado (Pipeline V1.2)
      bridge.consumeCombatEvents(payload.events);

      // 2. Renderização final (Snapshot do estado)
      bridge.renderState(payload.state, payload.ui);
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
