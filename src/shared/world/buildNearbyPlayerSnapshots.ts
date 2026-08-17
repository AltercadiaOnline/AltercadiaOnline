import type { PlayerSkinBundleId } from '../character/playerSkinBundle.js';
import type { PlayerFacing } from './playerFacing.js';
import type {
  RemotePlayerCompanionSnapshot,
  RemotePlayerSnapshot,
} from './remotePlayerSync.js';

export type NearbyPlayerPeerInput = {
  readonly playerId: string;
  readonly characterId: number;
  readonly displayName?: string;
  readonly skinBundleId?: PlayerSkinBundleId;
  readonly level?: number;
  readonly companion?: RemotePlayerCompanionSnapshot;
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
    ...(peer.skinBundleId ? { skinBundleId: peer.skinBundleId } : {}),
    ...(peer.level !== undefined ? { level: peer.level } : {}),
    ...(peer.companion ? { companion: peer.companion } : {}),
  };
}

export function buildNearbyPlayerSnapshots(
  peers: readonly NearbyPlayerPeerInput[],
  serverTimeMs: number,
): RemotePlayerSnapshot[] {
  return peers.map((peer) => toRemotePlayerSnapshot(peer, serverTimeMs));
}
