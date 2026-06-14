import { getActiveMapTileSize } from './activeMapTileSize.js';

/** Tile adjacente (8-vizinhos) — exclui a própria célula. */
export function isAdjacentTile(
  playerTileX: number,
  playerTileY: number,
  targetTileX: number,
  targetTileY: number,
): boolean {
  const dx = Math.abs(playerTileX - targetTileX);
  const dy = Math.abs(playerTileY - targetTileY);
  return dx <= 1 && dy <= 1 && (dx + dy) > 0;
}

export function tileCenterPixel(
  tileX: number,
  tileY: number,
  tileSize = getActiveMapTileSize(),
): { x: number; y: number } {
  return {
    x: tileX * tileSize + tileSize / 2,
    y: tileY * tileSize + tileSize / 2,
  };
}
