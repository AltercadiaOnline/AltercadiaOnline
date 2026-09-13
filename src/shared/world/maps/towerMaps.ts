import { DESIGN_CONFIG } from '../../../config/designConstants.js';
import { TileType } from '../tileTypes.js';
import type { Portal } from '../portals.js';
import { buildPortalsForMap } from '../buildConstructPortals.js';
import type { TowerMapId } from '../../tower/towerTypes.js';

const TILE = DESIGN_CONFIG.TILE.SIZE;

/** Hall público — Construct `entradatorredopoder` (1280×1280). */
export const TOWER_GATE_ID = 'tower_gate' as const;
export const TOWER_GATE_TILES = 40;
export const TOWER_GATE_PIXEL_WIDTH = TOWER_GATE_TILES * TILE;
export const TOWER_GATE_PIXEL_HEIGHT = TOWER_GATE_TILES * TILE;

/** Andares 1–5 — Construct `andar_*_torre_poder*` (640×640). */
export const TOWER_FLOOR_TILES = 20;
export const TOWER_FLOOR_PIXEL_WIDTH = TOWER_FLOOR_TILES * TILE;
export const TOWER_FLOOR_PIXEL_HEIGHT = TOWER_FLOOR_TILES * TILE;

export const TOWER_FLOOR_1_ID = 'tower_floor_1' as const;
export const TOWER_FLOOR_2_ID = 'tower_floor_2' as const;
export const TOWER_FLOOR_3_ID = 'tower_floor_3' as const;
export const TOWER_FLOOR_4_ID = 'tower_floor_4' as const;
export const TOWER_FLOOR_5_ID = 'tower_floor_5' as const;

export const TOWER_MAP_IDS = [
  TOWER_GATE_ID,
  TOWER_FLOOR_1_ID,
  TOWER_FLOOR_2_ID,
  TOWER_FLOOR_3_ID,
  TOWER_FLOOR_4_ID,
  TOWER_FLOOR_5_ID,
] as const satisfies readonly TowerMapId[];

export type TowerWorldMapId = (typeof TOWER_MAP_IDS)[number];

function generateFloorGrid(tilesWide: number, tilesHigh: number): number[][] {
  return Array.from({ length: tilesHigh }, () => Array<number>(tilesWide).fill(TileType.Floor));
}

function buildTowerMapStub(mapId: TowerWorldMapId, tiles: number, pixelW: number, pixelH: number) {
  const portals: readonly Portal[] = buildPortalsForMap(mapId);
  return {
    id: mapId,
    tilesWide: tiles,
    tilesHigh: tiles,
    tileSize: TILE,
    portals,
    generateData: () => generateFloorGrid(tiles, tiles),
    pixelWidth: () => pixelW,
    pixelHeight: () => pixelH,
  } as const;
}

/** Stub de grade — tudo Floor. Visual = Construct. Walkability = pixel bounds. */
export const TOWER_GATE_MAP = buildTowerMapStub(
  TOWER_GATE_ID,
  TOWER_GATE_TILES,
  TOWER_GATE_PIXEL_WIDTH,
  TOWER_GATE_PIXEL_HEIGHT,
);

export const TOWER_FLOOR_1_MAP = buildTowerMapStub(
  TOWER_FLOOR_1_ID,
  TOWER_FLOOR_TILES,
  TOWER_FLOOR_PIXEL_WIDTH,
  TOWER_FLOOR_PIXEL_HEIGHT,
);
export const TOWER_FLOOR_2_MAP = buildTowerMapStub(
  TOWER_FLOOR_2_ID,
  TOWER_FLOOR_TILES,
  TOWER_FLOOR_PIXEL_WIDTH,
  TOWER_FLOOR_PIXEL_HEIGHT,
);
export const TOWER_FLOOR_3_MAP = buildTowerMapStub(
  TOWER_FLOOR_3_ID,
  TOWER_FLOOR_TILES,
  TOWER_FLOOR_PIXEL_WIDTH,
  TOWER_FLOOR_PIXEL_HEIGHT,
);
export const TOWER_FLOOR_4_MAP = buildTowerMapStub(
  TOWER_FLOOR_4_ID,
  TOWER_FLOOR_TILES,
  TOWER_FLOOR_PIXEL_WIDTH,
  TOWER_FLOOR_PIXEL_HEIGHT,
);
export const TOWER_FLOOR_5_MAP = buildTowerMapStub(
  TOWER_FLOOR_5_ID,
  TOWER_FLOOR_TILES,
  TOWER_FLOOR_PIXEL_WIDTH,
  TOWER_FLOOR_PIXEL_HEIGHT,
);

export const TOWER_MAP_DEFS = {
  [TOWER_GATE_ID]: TOWER_GATE_MAP,
  [TOWER_FLOOR_1_ID]: TOWER_FLOOR_1_MAP,
  [TOWER_FLOOR_2_ID]: TOWER_FLOOR_2_MAP,
  [TOWER_FLOOR_3_ID]: TOWER_FLOOR_3_MAP,
  [TOWER_FLOOR_4_ID]: TOWER_FLOOR_4_MAP,
  [TOWER_FLOOR_5_ID]: TOWER_FLOOR_5_MAP,
} as const;

export const TOWER_GATE_PORTALS = TOWER_GATE_MAP.portals;
export const TOWER_FLOOR_1_PORTALS = TOWER_FLOOR_1_MAP.portals;
export const TOWER_FLOOR_2_PORTALS = TOWER_FLOOR_2_MAP.portals;
export const TOWER_FLOOR_3_PORTALS = TOWER_FLOOR_3_MAP.portals;
export const TOWER_FLOOR_4_PORTALS = TOWER_FLOOR_4_MAP.portals;
export const TOWER_FLOOR_5_PORTALS = TOWER_FLOOR_5_MAP.portals;

export function generateTowerGateMapData(): number[][] {
  return TOWER_GATE_MAP.generateData();
}

export function towerGatePixelWidth(): number {
  return TOWER_GATE_PIXEL_WIDTH;
}

export function towerGatePixelHeight(): number {
  return TOWER_GATE_PIXEL_HEIGHT;
}

export function generateTowerFloorMapData(): number[][] {
  return generateFloorGrid(TOWER_FLOOR_TILES, TOWER_FLOOR_TILES);
}

export function towerFloorPixelWidth(): number {
  return TOWER_FLOOR_PIXEL_WIDTH;
}

export function towerFloorPixelHeight(): number {
  return TOWER_FLOOR_PIXEL_HEIGHT;
}
