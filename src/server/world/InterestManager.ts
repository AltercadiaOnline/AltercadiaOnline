import { worldPixelToTile } from '../../shared/world/portals.js';
import { WORLD_INTEREST_RADIUS_TILES } from '../../shared/world/worldGameLoopConfig.js';
import type { ActivePlayerState } from './WorldGameState.js';

/** Distância de Chebyshev em tiles (adequada para grid). */
export function chebyshevTileDistance(
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  return Math.max(Math.abs(ax - bx), Math.abs(ay - by));
}

function playerTileCoords(player: Pick<ActivePlayerState, 'x' | 'y'>): {
  readonly tileX: number;
  readonly tileY: number;
} {
  return worldPixelToTile(player.x, player.y);
}

export function isWithinInterestRadius(
  observer: Pick<ActivePlayerState, 'mapId' | 'x' | 'y'>,
  target: Pick<ActivePlayerState, 'mapId' | 'x' | 'y'>,
  radiusTiles = WORLD_INTEREST_RADIUS_TILES,
): boolean {
  if (observer.mapId !== target.mapId) return false;
  const observerTile = playerTileCoords(observer);
  const targetTile = playerTileCoords(target);
  return chebyshevTileDistance(
    observerTile.tileX,
    observerTile.tileY,
    targetTile.tileX,
    targetTile.tileY,
  ) <= radiusTiles;
}

/**
 * Interest Management — retorna peers visíveis para um observador (exclui a si mesmo).
 */
export function selectPeersInInterest(
  observer: ActivePlayerState,
  candidates: readonly ActivePlayerState[],
  radiusTiles = WORLD_INTEREST_RADIUS_TILES,
): ActivePlayerState[] {
  const peers: ActivePlayerState[] = [];
  for (const candidate of candidates) {
    if (candidate.connectionId === observer.connectionId) continue;
    if (!isWithinInterestRadius(observer, candidate, radiusTiles)) continue;
    peers.push(candidate);
  }
  return peers;
}
