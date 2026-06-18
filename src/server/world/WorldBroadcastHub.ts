import {
  encodePeerTuple,
  type WorldPeersCompactPayload,
} from '../../shared/world/worldPeerWire.js';
import { WORLD_PEERS_FULL_RESYNC_TICKS } from '../../shared/world/worldGameLoopConfig.js';
import { selectPeersInInterest } from './InterestManager.js';
import type { ActivePlayerState, WorldGameState } from './WorldGameState.js';

export type PeerBroadcastSender = (
  connectionId: string,
  payload: WorldPeersCompactPayload,
) => void;

/**
 * Broadcasting com Interest Management — só envia peers próximos em formato compacto.
 */
export class WorldBroadcastHub {
  private readonly lastSignatureByConnection = new Map<string, string>();

  constructor(
    private readonly sendPeers: PeerBroadcastSender,
  ) {}

  broadcastPeerUpdates(tick: number, gameState: WorldGameState): void {
    const exploring = gameState.listAllActive().filter((player) => player.status === 'exploring');
    const forceFull = tick % WORLD_PEERS_FULL_RESYNC_TICKS === 0;

    for (const observer of exploring) {
      const mapHasDirty = forceFull || gameState.hasDirtyPeersOnMap(observer.mapId);
      if (!mapHasDirty && !observer.peerDirty) {
        continue;
      }

      const peersOnMap = exploring.filter((player) => player.mapId === observer.mapId);
      const visiblePeers = selectPeersInInterest(observer, peersOnMap);
      const payload: WorldPeersCompactPayload = {
        t: tick,
        m: observer.mapId,
        p: visiblePeers.map((peer) =>
          encodePeerTuple(peer.characterId, peer.x, peer.y, peer.facing),
        ),
      };

      const signature = JSON.stringify(payload.p);
      const previous = this.lastSignatureByConnection.get(observer.connectionId);
      if (!forceFull && previous === signature && !observer.peerDirty) {
        continue;
      }

      this.lastSignatureByConnection.set(observer.connectionId, signature);
      this.sendPeers(observer.connectionId, payload);
      gameState.clearPeerDirty(observer.connectionId);
    }
  }

  clearConnection(connectionId: string): void {
    this.lastSignatureByConnection.delete(connectionId);
  }

  reset(): void {
    this.lastSignatureByConnection.clear();
  }
}
