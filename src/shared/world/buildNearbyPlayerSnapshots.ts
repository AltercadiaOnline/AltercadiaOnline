import type { PlayerFacing } from './playerFacing.js';
import type { RemotePlayerSnapshot } from './remotePlayerSync.js';

export type NearbyPlayerPeerInput = {
  readonly playerId: string;
  readonly characterId: number;
  readonly displayName?: string;
  readonly mapId: string;
  readonly feetX: number;
  readonly feetY: number;
  readonly facing: PlayerFacing;
};

export function toRemotePlayerSnapshot(
  peer: NearbyPlayerPeerInput,
  serverTimeMs: number,
): RemotePlayerSnapshot {
  return {
    playerId: peer.playerId,
    characterId: peer.characterId,
    mapId: peer.mapId,
    feetX: peer.feetX,
    feetY: peer.feetY,
    facing: peer.facing,
    serverTimeMs,
    ...(peer.displayName ? { displayName: peer.displayName } : {}),
  };
}

export function buildNearbyPlayerSnapshots(
  peers: readonly NearbyPlayerPeerInput[],
  serverTimeMs: number,
): RemotePlayerSnapshot[] {
  return peers.map((peer) => toRemotePlayerSnapshot(peer, serverTimeMs));
}
