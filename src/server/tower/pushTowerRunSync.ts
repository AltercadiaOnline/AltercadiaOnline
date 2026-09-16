import type { TowerHudPublicSnapshot } from '../../shared/tower/towerTypes.js';
import { serializeWsOutbound } from '../../shared/wsProtocol.js';
import { getPlayerSocket } from '../net/playerSocketLookup.js';

/** Empurra espelho da torre para membros da party (timer SINAL / HUD spawn). */
export function pushTowerRunSyncForParty(
  playerIds: readonly string[],
  payload: TowerHudPublicSnapshot,
): void {
  const message = serializeWsOutbound({
    type: 'tower-run-sync',
    payload,
  });
  for (const playerId of playerIds) {
    const ws = getPlayerSocket(playerId);
    if (!ws || ws.readyState !== ws.OPEN) continue;
    try {
      ws.send(message);
    } catch {
      // peer desconectou — ok
    }
  }
}
