/**
 * Bootstrap de combate no browser:
 *
 * import { initBattleHud, configureCombatClient } from './src/client/hud/index.js';
 * import { initCombatSocket } from './src/client/combat-socket.js';
 *
 * initBattleHud(document);
 * configureCombatClient({ emitAction: (action) => socket.emit('combat-action', action) });
 * initCombatSocket(socket);
 */

export { initCombatSocket } from '../combat-socket.js';
