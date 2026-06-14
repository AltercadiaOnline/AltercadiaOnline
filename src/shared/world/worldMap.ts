export { TILE_SIZE, MAP_TILES, ZONE_TILES } from './mapConstants.js';

export { TileType, type TileId, isTileBlocking } from './tileTypes.js';

export {
  CITY_01_ID,
  CITY_01_TILE_SIZE,
  CITY_01_MAP_TILES,
  CITY_01_PORTALS,
  generateCity01MapData,
  city01PixelWidth,
  city01PixelHeight,
} from './maps/city01.js';

export {
  FARM_ZONE_01_ID,
  FARM_ZONE_01_TILES_WIDE,
  FARM_ZONE_01_TILES_HIGH,
  FARM_ZONE_01_PORTALS,
  generateFarmZone01MapData,
  farmZone01PixelWidth,
  farmZone01PixelHeight,
} from './maps/farm_zone_01.js';

export {
  DEFAULT_MAP_ID,
  MAP_REGISTRY,
  getMapDefinition,
  isMapId,
  type MapDefinition,
  type MapId,
} from './mapRegistry.js';

export {
  findPortalAtTile,
  checkPortal,
  buildPortalTransitionPayload,
  portalCenterTile,
  portalInteractionContains,
  portalZoneContains,
  tileCenterToWorldPixel,
  worldPixelToTile,
  portalTargetSpawn,
  toMapPortalTrigger,
  type Portal,
  type PortalZone,
  type MapPortalTrigger,
  type PortalTargetSpawn,
} from './portals.js';

import { getActiveMapTileSize } from './activeMapTileSize.js';
import { MAP_TILES, TILE_SIZE } from './mapConstants.js';
import { isTileBlocking, TileType } from './tileTypes.js';
import { DEFAULT_MAP_ID, getMapDefinition } from './mapRegistry.js';
import { generateCity01MapData, city01PixelHeight, city01PixelWidth } from './maps/city01.js';

/** Mapa padrão do overworld: Cidade 01. */
export function generateMapData(): number[][] {
  return generateCity01MapData();
}

export function tileAt(
  mapData: number[][],
  worldX: number,
  worldY: number,
  tileSize = getActiveMapTileSize(),
): number {
  const col = Math.floor(worldX / tileSize);
  const row = Math.floor(worldY / tileSize);
  const mapHeight = mapData.length;
  const mapWidth = mapData[0]?.length ?? 0;

  if (col < 0 || row < 0 || col >= mapWidth || row >= mapHeight) {
    return TileType.Wall;
  }

  return mapData[row]?.[col] ?? TileType.Wall;
}

export function canWalkAt(mapData: number[][], worldX: number, worldY: number): boolean {
  return !isTileBlocking(tileAt(mapData, worldX, worldY));
}

export function mapPixelWidth(): number {
  return city01PixelWidth();
}

export function mapPixelHeight(): number {
  return city01PixelHeight();
}
