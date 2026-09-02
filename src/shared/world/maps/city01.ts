import { DESIGN_CONFIG } from '../../../config/designConstants.js';
import { TileType } from '../tileTypes.js';
import type { Portal } from '../portals.js';
import { ZoneId } from '../../items/itemTypes.js';
import {
  CITY_01_MAP_TILES,
  CITY_01_PIXEL_HEIGHT,
  CITY_01_PIXEL_WIDTH,
} from './city01LayoutConstants.js';
import { buildPortalsForMap } from '../buildConstructPortals.js';

export const CITY_01_ID = 'city_01' as const;

export { CITY_01_MAP_TILES };
export const CITY_01_TILE_SIZE = DESIGN_CONFIG.TILE.SIZE;
export const CITY_01_TILES_WIDE = CITY_01_MAP_TILES;
export const CITY_01_TILES_HIGH = CITY_01_MAP_TILES;

/** Portais da Cidade 01 — gerados do catálogo + markers Construct. */
export const portals: readonly Portal[] = buildPortalsForMap(CITY_01_ID);

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
