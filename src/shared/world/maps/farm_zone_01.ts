import { TileType } from '../tileTypes.js';
import type { Portal } from '../portals.js';
import { CITY_01_ID } from './city01.js';
import {
  FARM_ZONE_01_PIXEL_HEIGHT,
  FARM_ZONE_01_PIXEL_WIDTH,
  FARM_ZONE_01_TILE_SIZE,
  FARM_ZONE_01_TILES_HIGH,
  FARM_ZONE_01_TILES_WIDE,
} from './farmZone01LayoutConstants.js';
import { buildPortalsForMap } from '../buildConstructPortals.js';
import {
  constructPortalToTriggerTiles,
  findConstructPortalPlacement,
} from '../constructPortalPlacements.js';

export const FARM_ZONE_01_ID = 'farm_zone_01' as const;

export {
  FARM_ZONE_01_TILES_WIDE,
  FARM_ZONE_01_TILES_HIGH,
  FARM_ZONE_01_TILE_SIZE,
  FARM_ZONE_01_PIXEL_WIDTH,
  FARM_ZONE_01_PIXEL_HEIGHT,
} from './farmZone01LayoutConstants.js';

const FARM_SOUTH_PLACEMENT = findConstructPortalPlacement('farm_portal_south', 'zonabeco1');
const FARM_SOUTH_TRIGGER = FARM_SOUTH_PLACEMENT
  ? constructPortalToTriggerTiles(FARM_SOUTH_PLACEMENT)
  : { tileX: 0, tileY: 0, tileW: 1, tileH: 1 };

/** Zona de interação = footprint do portal sul Construct (layout principal). */
export const FARM_ZONE_01_SOUTH_EXIT_ZONE = {
  tileX: FARM_SOUTH_TRIGGER.tileX,
  tileY: FARM_SOUTH_TRIGGER.tileY,
  tileW: FARM_SOUTH_TRIGGER.tileW,
  tileH: FARM_SOUTH_TRIGGER.tileH,
} as const;

/** Beco dos Fundos — todos os portais Construct (filtrados por layout ativo no runtime). */
export const portals: readonly Portal[] = buildPortalsForMap(FARM_ZONE_01_ID);

export const FARM_ZONE_01_PORTALS = portals;

/**
 * Stub de grade — tudo Floor.
 * Com WORLD_LEGACY_COLLISION_ENABLED=false a walkability usa pixel bounds do Construct.
 */
export function generateFarmZone01MapData(): number[][] {
  return Array.from({ length: FARM_ZONE_01_TILES_HIGH }, () =>
    Array<number>(FARM_ZONE_01_TILES_WIDE).fill(TileType.Floor),
  );
}

export function farmZone01PixelWidth(): number {
  return FARM_ZONE_01_PIXEL_WIDTH;
}

export function farmZone01PixelHeight(): number {
  return FARM_ZONE_01_PIXEL_HEIGHT;
}
