import { DESIGN_CONFIG } from '../../../config/designConstants.js';
import { TileType } from '../tileTypes.js';
import type { Portal } from '../portals.js';
import { ZoneId } from '../../items/itemTypes.js';
import {
  CITY_01_MAP_TILES,
  CITY_01_PIXEL_HEIGHT,
  CITY_01_PIXEL_WIDTH,
} from './city01LayoutConstants.js';
import {
  CONSTRUCT_PORTAL_PLACEMENTS,
  constructPortalArrivalTile,
  constructPortalToTriggerTiles,
} from '../constructPortalPlacements.js';

export const CITY_01_ID = 'city_01' as const;

export { CITY_01_MAP_TILES };
export const CITY_01_TILE_SIZE = DESIGN_CONFIG.TILE.SIZE;
export const CITY_01_TILES_WIDE = CITY_01_MAP_TILES;
export const CITY_01_TILES_HIGH = CITY_01_MAP_TILES;

const CITY_NORTH_TRIGGER = constructPortalToTriggerTiles(
  CONSTRUCT_PORTAL_PLACEMENTS.city_portal_north,
);
/** Chegada no beco: um pouco ao norte do portal sul Construct (evita loop imediato). */
const FARM_ARRIVAL = constructPortalArrivalTile(
  CONSTRUCT_PORTAL_PLACEMENTS.farm_portal_south,
  { dx: 0, dy: -2 },
);

/**
 * Portais da Cidade 01 — gatilho = marker Construct `city_portal_north`.
 * Norte → sul do Beco (farm_zone_01).
 */
export const portals: readonly Portal[] = [
  {
    id: 'city_portal_north',
    mapId: CITY_01_ID,
    label: 'Beco dos Fundos',
    direction: 'north',
    tileX: CITY_NORTH_TRIGGER.tileX,
    tileY: CITY_NORTH_TRIGGER.tileY,
    tileW: CITY_NORTH_TRIGGER.tileW,
    tileH: CITY_NORTH_TRIGGER.tileH,
    targetMapId: 'farm_zone_01',
    targetPosition: FARM_ARRIVAL,
    targetZoneId: ZoneId.Zone1,
  },
];

export const CITY_01_PORTALS = portals;

/**
 * Stub de grade — tudo Floor.
 * Visual = Construct `cidade_01`. Walkability = pixel bounds (WORLD_LEGACY_COLLISION_ENABLED=false).
 */
export function generateCity01MapData(): number[][] {
  return Array.from({ length: CITY_01_TILES_HIGH }, () =>
    Array<number>(CITY_01_TILES_WIDE).fill(TileType.Floor),
  );
}

export function city01PixelWidth(): number {
  return CITY_01_PIXEL_WIDTH;
}

export function city01PixelHeight(): number {
  return CITY_01_PIXEL_HEIGHT;
}

export { isCity01RoadNetworkTile } from './city01LayoutConstants.js';
