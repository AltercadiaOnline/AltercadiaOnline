import { GameClient, configureCombatClient } from './hud/index.js';
import {
  createCombatSocketHandler,
  type CombatSocket,
} from './hud/combatSocketHandler.js';

export type { CombatDispatchPayload } from '../shared/combatWire.js';
export {
  configureCombatClient,
  initBattleHud,
  GameClient,
  getBattleHud,
  getLastCombatState,
} from './hud/index.js';

/** Socket.io e wrappers compatíveis (removeAllListeners opcional). */
export type CombatSocketClient = CombatSocket & {
  removeAllListeners?(event?: string): void;
};

/**
 * Único ponto de entrada de eventos de combate no cliente V2.
 * Valida payload, processa eventos e aplica snapshot (Proxy UI inclusa).
 */
export function initCombatSocket(socket: CombatSocketClient): void {
  socket.removeAllListeners?.('combat-event');

  socket.on('combat-event', createCombatSocketHandler(GameClient));

  console.log('--- Sistema de Rede V2 Ativado ---');
}
