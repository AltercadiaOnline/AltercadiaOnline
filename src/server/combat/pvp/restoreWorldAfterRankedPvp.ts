/**
 * Após duelo PVP: libera flag de combate e recoloca peers em `exploring`
 * na posição do world profile (mesma pose do duelo — sem teleporte fantasma).
 */

import { getWorldProfile } from '../../world/worldProfileStore.js';
import { getWorldGameState } from '../../world/WorldGameState.js';
import { setPlayerInBattle } from '../../models/playerSessionRegistry.js';
import type { RankedPvpPeer } from './RankedPvpCombatSession.js';

export function restoreWorldPeersAfterRankedPvp(
  peers: readonly RankedPvpPeer[],
  tickMs: number = Date.now(),
): void {
  const gameState = getWorldGameState();
  for (const peer of peers) {
    setPlayerInBattle(peer.playerId, peer.characterId, false);
    const profile = getWorldProfile(peer.playerId, peer.characterId);
    gameState.syncFromProfile(peer.connectionId, profile, 'exploring', tickMs);
  }
}
