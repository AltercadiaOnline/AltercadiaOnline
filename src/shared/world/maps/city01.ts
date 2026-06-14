import { DESIGN_CONFIG } from '../../../config/designConstants.js';
import { TileType } from '../tileTypes.js';
import type { Portal } from '../portals.js';
import { ZoneId } from '../../items/itemTypes.js';
import {
  CITY_01_MAP_TILES,
  CITY_01_PLAZA_MIN,
  CITY_01_PLAZA_MAX,
  CITY_01_RESIDENTIAL_ZONE,
  CITY_01_COMMERCE_ZONE,
  CITY_01_ROAD_NORTH_Y,
  CITY_01_ROAD_SOUTH_Y,
  CITY_01_ROAD_X_MAX,
  CITY_01_ROAD_X_MIN,
  CITY_01_ROAD_Y_MAX,
  CITY_01_ROAD_Y_MIN,
  isCity01CommerceSpineTile,
  isCity01ResidentialSpineTile,
  isCity01RefractionBoothRoadTile,
} from './city01LayoutConstants.js';

export const CITY_01_ID = 'city_01' as const;

export { CITY_01_MAP_TILES };
export const CITY_01_TILE_SIZE = DESIGN_CONFIG.TILE.SIZE;
export const CITY_01_TILES_WIDE = CITY_01_MAP_TILES;
export const CITY_01_TILES_HIGH = CITY_01_MAP_TILES;

const ROAD_CENTER_MIN = CITY_01_ROAD_X_MIN;
const ROAD_TILES_WIDE = CITY_01_ROAD_X_MAX - CITY_01_ROAD_X_MIN + 1;
const CITY_PORTAL_NORTH_CENTER_X = ROAD_CENTER_MIN + Math.floor((ROAD_TILES_WIDE - 1) / 2);

/**
 * Portais da Cidade 01 — apenas conexões manuais declaradas aqui.
 * Norte → sul do Beco (farm_zone_01). Sul/Leste/Oeste não têm saída.
 */
export const portals: readonly Portal[] = [
  {
    id: 'city_portal_north',
    mapId: CITY_01_ID,
    label: 'Beco dos Fundos',
    direction: 'north',
    tileX: CITY_PORTAL_NORTH_CENTER_X,
    tileY: CITY_01_ROAD_NORTH_Y,
    tileW: 1,
    tileH: 1,
    targetMapId: 'farm_zone_01',
    targetPosition: { x: 18, y: 57 },
    targetZoneId: ZoneId.Zone1,
  },
];

export const CITY_01_PORTALS = portals;

const CHERRY_TREE_CORNERS: ReadonlyArray<readonly [number, number]> = [
  [CITY_01_PLAZA_MIN, CITY_01_PLAZA_MIN],
  [CITY_01_PLAZA_MIN, CITY_01_PLAZA_MAX],
  [CITY_01_PLAZA_MAX, CITY_01_PLAZA_MIN],
  [CITY_01_PLAZA_MAX, CITY_01_PLAZA_MAX],
];

function paintBorderWalls(mapData: number[][]): void {
  for (let x = 0; x < CITY_01_MAP_TILES; x++) {
    mapData[0]![x] = TileType.Wall;
    mapData[CITY_01_MAP_TILES - 1]![x] = TileType.Wall;
  }

  for (let y = 0; y < CITY_01_MAP_TILES; y++) {
    mapData[y]![0] = TileType.Wall;
    mapData[y]![CITY_01_MAP_TILES - 1] = TileType.Wall;
  }
}

function paintCentralArena(mapData: number[][]): void {
  for (let y = CITY_01_PLAZA_MIN; y <= CITY_01_PLAZA_MAX; y++) {
    for (let x = CITY_01_PLAZA_MIN; x <= CITY_01_PLAZA_MAX; x++) {
      mapData[y]![x] = TileType.Stairs;
    }
  }
}

function paintCherryTrees(mapData: number[][]): void {
  for (const [x, y] of CHERRY_TREE_CORNERS) {
    mapData[y]![x] = TileType.Obstacle;
  }
}

function paintRoadCorridors(mapData: number[][]): void {
  for (let y = CITY_01_ROAD_NORTH_Y; y <= CITY_01_ROAD_SOUTH_Y; y++) {
    for (let x = CITY_01_ROAD_X_MIN; x <= CITY_01_ROAD_X_MAX; x++) {
      if (mapData[y]?.[x] === TileType.Obstacle) {
        mapData[y]![x] = TileType.Floor;
      }
    }
  }

  const branchWest = CITY_01_RESIDENTIAL_ZONE.tileX;
  const branchEast = CITY_01_COMMERCE_ZONE.tileX + CITY_01_COMMERCE_ZONE.tileW - 1;
  for (let y = CITY_01_ROAD_Y_MIN; y <= CITY_01_ROAD_Y_MAX; y++) {
    for (let x = branchWest; x <= branchEast; x++) {
      if (mapData[y]?.[x] === TileType.Obstacle) {
        mapData[y]![x] = TileType.Floor;
      }
    }
  }

  for (let y = 0; y < CITY_01_MAP_TILES; y++) {
    for (let x = 0; x < CITY_01_MAP_TILES; x++) {
      if (
        !isCity01ResidentialSpineTile(x, y) &&
        !isCity01CommerceSpineTile(x, y) &&
        !isCity01RefractionBoothRoadTile(x, y)
      ) {
        continue;
      }
      if (mapData[y]?.[x] === TileType.Obstacle) {
        mapData[y]![x] = TileType.Floor;
      }
    }
  }
}

function paintPortalFloors(mapData: number[][]): void {
  for (const portal of CITY_01_PORTALS) {
    for (let dy = 0; dy < portal.tileH; dy++) {
      for (let dx = 0; dx < portal.tileW; dx++) {
        const x = portal.tileX + dx;
        const y = portal.tileY + dy;
        if (mapData[y]?.[x] === TileType.Wall) {
          mapData[y]![x] = TileType.Floor;
        }
      }
    }
  }
}

export function generateCity01MapData(): number[][] {
  const mapData: number[][] = Array.from({ length: CITY_01_MAP_TILES }, () =>
    Array<number>(CITY_01_MAP_TILES).fill(TileType.Floor),
  );

  paintBorderWalls(mapData);
  paintCentralArena(mapData);
  paintCherryTrees(mapData);
  paintRoadCorridors(mapData);
  paintPortalFloors(mapData);

  return mapData;
}

export function city01PixelWidth(): number {
  return CITY_01_TILES_WIDE * CITY_01_TILE_SIZE;
}

export function city01PixelHeight(): number {
  return CITY_01_TILES_HIGH * CITY_01_TILE_SIZE;
}

export { isCity01RoadNetworkTile } from './city01LayoutConstants.js';
