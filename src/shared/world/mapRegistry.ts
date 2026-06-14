import {
  CITY_01_ID,
  CITY_01_PORTALS,
  CITY_01_TILE_SIZE,
  CITY_01_TILES_HIGH,
  CITY_01_TILES_WIDE,
  generateCity01MapData,
  city01PixelHeight,
  city01PixelWidth,
} from './maps/city01.js';
import {
  FARM_ZONE_01_ID,
  FARM_ZONE_01_PORTALS,
  FARM_ZONE_01_TILE_SIZE,
  FARM_ZONE_01_TILES_HIGH,
  FARM_ZONE_01_TILES_WIDE,
  generateFarmZone01MapData,
  farmZone01PixelHeight,
  farmZone01PixelWidth,
} from './maps/farm_zone_01.js';
import type { Portal } from './portals.js';
import { TILE_SIZE } from './mapConstants.js';

export type MapId = typeof CITY_01_ID | typeof FARM_ZONE_01_ID;

export type MapDefinition = {
  readonly id: MapId;
  readonly tilesWide: number;
  readonly tilesHigh: number;
  readonly tileSize: number;
  readonly generateData: () => number[][];
  readonly portals: readonly Portal[];
  readonly pixelWidth: () => number;
  readonly pixelHeight: () => number;
};

export const MAP_REGISTRY: Record<MapId, MapDefinition> = {
  [CITY_01_ID]: {
    id: CITY_01_ID,
    tilesWide: CITY_01_TILES_WIDE,
    tilesHigh: CITY_01_TILES_HIGH,
    tileSize: CITY_01_TILE_SIZE,
    generateData: generateCity01MapData,
    portals: CITY_01_PORTALS,
    pixelWidth: city01PixelWidth,
    pixelHeight: city01PixelHeight,
  },
  [FARM_ZONE_01_ID]: {
    id: FARM_ZONE_01_ID,
    tilesWide: FARM_ZONE_01_TILES_WIDE,
    tilesHigh: FARM_ZONE_01_TILES_HIGH,
    tileSize: FARM_ZONE_01_TILE_SIZE,
    generateData: generateFarmZone01MapData,
    portals: FARM_ZONE_01_PORTALS,
    pixelWidth: farmZone01PixelWidth,
    pixelHeight: farmZone01PixelHeight,
  },
};

export const DEFAULT_MAP_ID: MapId = CITY_01_ID;

export function getMapDefinition(mapId: string): MapDefinition | null {
  return MAP_REGISTRY[mapId as MapId] ?? null;
}

export function isMapId(value: string): value is MapId {
  return value in MAP_REGISTRY;
}
