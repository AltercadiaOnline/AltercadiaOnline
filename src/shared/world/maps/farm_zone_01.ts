import { DESIGN_CONFIG } from '../../../config/designConstants.js';
import { TileType } from '../tileTypes.js';
import type { Portal } from '../portals.js';
import { CITY_01_ID } from './city01.js';
import {
  FARM_ZONE_01_ALLEY_MAX,
  FARM_ZONE_01_ALLEY_MIN,
} from './farmZone01LayoutConstants.js';

export const FARM_ZONE_01_ID = 'farm_zone_01' as const;

/** Beco dos Fundos — extensão urbana da cidade; grade 38×60 @ 40px. */
export const FARM_ZONE_01_TILES_WIDE = DESIGN_CONFIG.MAP.MAX_TILES_WIDTH;
export const FARM_ZONE_01_TILES_HIGH = DESIGN_CONFIG.MAP.MAX_TILES_HEIGHT;
export const FARM_ZONE_01_TILE_SIZE = DESIGN_CONFIG.TILE.SIZE;

const ALLEY_CENTER_MIN = FARM_ZONE_01_ALLEY_MIN;
const ALLEY_CENTER_MAX = FARM_ZONE_01_ALLEY_MAX;

const CITY_NORTH_SPAWN_X = 29;
const CITY_NORTH_SPAWN_Y = 2;

/** Faixa walkable alargada na saída sul — separada do gatilho visual de teleporte. */
export const FARM_ZONE_01_SOUTH_EXIT_ZONE = {
  tileX: ALLEY_CENTER_MIN,
  tileY: FARM_ZONE_01_TILES_HIGH - 6,
  tileW: (ALLEY_CENTER_MAX - ALLEY_CENTER_MIN + 1) * 2,
  tileH: 4,
} as const;

function southExitZoneContains(tileX: number, tileY: number): boolean {
  const zone = FARM_ZONE_01_SOUTH_EXIT_ZONE;
  return (
    tileX >= zone.tileX
    && tileX < zone.tileX + zone.tileW
    && tileY >= zone.tileY
    && tileY < zone.tileY + zone.tileH
  );
}

const FARM_PORTAL_SOUTH_CENTER_X = ALLEY_CENTER_MIN + Math.floor(FARM_ZONE_01_SOUTH_EXIT_ZONE.tileW / 2);
const FARM_PORTAL_SOUTH_CENTER_Y = FARM_ZONE_01_SOUTH_EXIT_ZONE.tileY + Math.floor(FARM_ZONE_01_SOUTH_EXIT_ZONE.tileH / 2);

/**
 * Beco dos Fundos — única saída manual no sul (retorno à Cidade).
 * O extremo norte é beco sem saída; o jogador deve voltar pelo mesmo caminho.
 */
export const portals: readonly Portal[] = [
  {
    id: 'farm_portal_south',
    mapId: FARM_ZONE_01_ID,
    label: 'Retorno à Cidade',
    direction: 'south',
    tileX: FARM_PORTAL_SOUTH_CENTER_X,
    tileY: FARM_PORTAL_SOUTH_CENTER_Y,
    tileW: 1,
    tileH: 1,
    targetMapId: CITY_01_ID,
    targetPosition: { x: CITY_NORTH_SPAWN_X, y: CITY_NORTH_SPAWN_Y },
  },
];

export const FARM_ZONE_01_PORTALS = portals;

function paintBorderWalls(mapData: number[][]): void {
  for (let x = 0; x < FARM_ZONE_01_TILES_WIDE; x++) {
    mapData[0]![x] = TileType.Wall;
    mapData[FARM_ZONE_01_TILES_HIGH - 1]![x] = TileType.Wall;
  }
  for (let y = 0; y < FARM_ZONE_01_TILES_HIGH; y++) {
    mapData[y]![0] = TileType.Wall;
    mapData[y]![FARM_ZONE_01_TILES_WIDE - 1] = TileType.Wall;
  }
}

function paintPortalFloors(mapData: number[][]): void {
  const zone = FARM_ZONE_01_SOUTH_EXIT_ZONE;
  for (let dy = 0; dy < zone.tileH; dy++) {
    for (let dx = 0; dx < zone.tileW; dx++) {
      const x = zone.tileX + dx;
      const y = zone.tileY + dy;
      if (mapData[y]?.[x] === TileType.Wall) {
        mapData[y]![x] = TileType.Floor;
      }
    }
  }
}

function isAlleyWalkableTile(tileX: number, tileY: number): boolean {
  if (southExitZoneContains(tileX, tileY)) {
    return true;
  }
  return tileX >= ALLEY_CENTER_MIN && tileX <= ALLEY_CENTER_MAX;
}

/** Laterais do beco — prédios bloqueiam; só o corredor (e zona de portal) é walkable. */
function paintAlleyFlankWalls(mapData: number[][]): void {
  for (let y = 1; y < FARM_ZONE_01_TILES_HIGH - 1; y += 1) {
    for (let x = 1; x < FARM_ZONE_01_TILES_WIDE - 1; x += 1) {
      if (!isAlleyWalkableTile(x, y)) {
        mapData[y]![x] = TileType.Wall;
      }
    }
  }
}

/** Beco dos Fundos — corredor vertical urbano (EUA + Tóquio) com flancos sólidos. */
export function generateFarmZone01MapData(): number[][] {
  const mapData: number[][] = Array.from({ length: FARM_ZONE_01_TILES_HIGH }, () =>
    Array<number>(FARM_ZONE_01_TILES_WIDE).fill(TileType.Floor),
  );

  paintBorderWalls(mapData);
  paintAlleyFlankWalls(mapData);
  paintPortalFloors(mapData);

  return mapData;
}

export function farmZone01PixelWidth(): number {
  return FARM_ZONE_01_TILES_WIDE * FARM_ZONE_01_TILE_SIZE;
}

export function farmZone01PixelHeight(): number {
  return FARM_ZONE_01_TILES_HIGH * FARM_ZONE_01_TILE_SIZE;
}
