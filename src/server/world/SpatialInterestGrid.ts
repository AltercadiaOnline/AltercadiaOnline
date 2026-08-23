import { worldPixelToTile } from '../../shared/world/portals.js';
import { WORLD_INTEREST_RADIUS_TILES } from '../../shared/world/worldGameLoopConfig.js';
import type { ActivePlayerState } from './WorldGameState.js';
import { chebyshevTileDistance, isWithinInterestRadius, selectPeersInInterest } from './InterestManager.js';

type TileBucketKey = string;

function tileBucketKey(tileX: number, tileY: number): TileBucketKey {
  return `${tileX},${tileY}`;
}

/**
 * Índice espacial por tile — evita O(n²) quando muitos peers compartilham o mapa.
 */
export class SpatialPeerIndex {
  private readonly buckets = new Map<TileBucketKey, ActivePlayerState[]>();

  constructor(candidates: readonly ActivePlayerState[]) {
    for (const candidate of candidates) {
      const tile = worldPixelToTile(candidate.x, candidate.y);
      const key = tileBucketKey(tile.tileX, tile.tileY);
      const bucket = this.buckets.get(key) ?? [];
      bucket.push(candidate);
      this.buckets.set(key, bucket);
    }
  }

  query(observer: ActivePlayerState, radiusTiles = WORLD_INTEREST_RADIUS_TILES): ActivePlayerState[] {
    const observerTile = worldPixelToTile(observer.x, observer.y);
    const peers: ActivePlayerState[] = [];
    const seen = new Set<string>();

    for (let dx = -radiusTiles; dx <= radiusTiles; dx += 1) {
      for (let dy = -radiusTiles; dy <= radiusTiles; dy += 1) {
        const bucket = this.buckets.get(tileBucketKey(observerTile.tileX + dx, observerTile.tileY + dy));
        if (!bucket) continue;
        for (const candidate of bucket) {
          if (candidate.connectionId === observer.connectionId) continue;
          if (seen.has(candidate.connectionId)) continue;
          if (!isWithinInterestRadius(observer, candidate, radiusTiles)) continue;
          seen.add(candidate.connectionId);
          peers.push(candidate);
        }
      }
    }

    return peers;
  }
}

/** Preferir índice espacial quando há massa de peers no mapa. */
export function selectPeersInInterestFromCandidates(
  observer: ActivePlayerState,
  candidates: readonly ActivePlayerState[],
  radiusTiles = WORLD_INTEREST_RADIUS_TILES,
): ActivePlayerState[] {
  if (candidates.length <= 12) {
    return selectPeersInInterest(observer, candidates, radiusTiles);
  }
  return new SpatialPeerIndex(candidates).query(observer, radiusTiles);
}

/** @internal */
export function __chebyshevForTests(
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  return chebyshevTileDistance(ax, ay, bx, by);
}
