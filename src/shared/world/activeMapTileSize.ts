import { DESIGN_CONFIG } from '../../config/designConstants.js';
import { getMapDefinition } from './mapRegistry.js';

let activeTileSize: number = DESIGN_CONFIG.TILE.SIZE;

function resolveTileSizeForMap(mapId: string): number {
  const map = getMapDefinition(mapId);
  if (map) return map.tileSize;
  return DESIGN_CONFIG.TILE.SIZE;
}

/** Atualiza tile lógico ativo ao trocar de mapa. */
export function setActiveMapTileSize(mapId: string): void {
  activeTileSize = resolveTileSizeForMap(mapId);
}

export function getActiveMapTileSize(): number {
  return activeTileSize;
}

export function resolveMapTileSize(mapId: string): number {
  return resolveTileSizeForMap(mapId);
}

export function resetActiveMapTileSize(): void {
  activeTileSize = DESIGN_CONFIG.TILE.SIZE;
}

/** Tile size de design para cenas registradas em sceneConfig. */
export const DESIGN_TILE_SIZE = DESIGN_CONFIG.TILE.SIZE;
