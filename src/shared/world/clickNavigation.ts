import { canPlayerWalkAt } from './movement.js';
import { tileCenterToWorldPixel, worldPixelToTile } from './portals.js';

export type ApproachTile = {
  readonly tileX: number;
  readonly tileY: number;
  readonly worldX: number;
  readonly worldY: number;
};

/** Tile walkable adjacente mais próximo do jogador para aproximar de um alvo. */
export function findApproachTile(
  mapData: number[][],
  objectTileX: number,
  objectTileY: number,
  playerWorldX: number,
  playerWorldY: number,
): ApproachTile | null {
  let best: ApproachTile | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;

      const tileX = objectTileX + dx;
      const tileY = objectTileY + dy;
      const center = tileCenterToWorldPixel(tileX, tileY);
      if (!canPlayerWalkAt(mapData, center)) continue;

      const distance = Math.hypot(center.x - playerWorldX, center.y - playerWorldY);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = { tileX, tileY, worldX: center.x, worldY: center.y };
      }
    }
  }

  return best;
}

export function findPortalEntryTile(
  mapData: number[][],
  portalTiles: ReadonlyArray<{ tileX: number; tileY: number }>,
  playerWorldX: number,
  playerWorldY: number,
): ApproachTile | null {
  let best: ApproachTile | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const tile of portalTiles) {
    const center = tileCenterToWorldPixel(tile.tileX, tile.tileY);
    if (!canPlayerWalkAt(mapData, center)) continue;

    const distance = Math.hypot(center.x - playerWorldX, center.y - playerWorldY);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = { tileX: tile.tileX, tileY: tile.tileY, worldX: center.x, worldY: center.y };
    }
  }

  return best;
}

/** Jogador chegou ao tile de destino do clique. */
export function hasReachedClickTile(
  playerWorldX: number,
  playerWorldY: number,
  targetTileX: number,
  targetTileY: number,
): boolean {
  const playerTile = worldPixelToTile(playerWorldX, playerWorldY);
  return playerTile.tileX === targetTileX && playerTile.tileY === targetTileY;
}

/** @deprecated Use hasReachedClickTile — mantido para imports legados. */
export const CLICK_NAV_ARRIVAL_RADIUS_PX = 0;

export function hasReachedClickTarget(
  playerWorldX: number,
  playerWorldY: number,
  targetWorldX: number,
  targetWorldY: number,
): boolean {
  const target = worldPixelToTile(targetWorldX, targetWorldY);
  return hasReachedClickTile(playerWorldX, playerWorldY, target.tileX, target.tileY);
}
