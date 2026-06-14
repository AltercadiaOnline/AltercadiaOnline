import { DESIGN_CONFIG, DESIGN_MAP_PIXEL_HEIGHT, DESIGN_MAP_PIXEL_WIDTH } from './designConstants.js';
import { CITY_01_ID } from '../shared/world/maps/city01.js';
import { FARM_ZONE_01_ID } from '../shared/world/maps/farm_zone_01.js';

export type SceneConfig = {
  readonly id: string;
  readonly mapId: string;
  readonly displayName: string;
  readonly tilesWide: number;
  readonly tilesHigh: number;
  readonly tileSize: number;
  readonly mapPixelWidth: number;
  readonly mapPixelHeight: number;
  readonly viewportWidth: number;
  readonly viewportHeight: number;
  readonly visibleTilesWide: number;
  readonly visibleTilesHigh: number;
};

/** Beco dos Fundos — cena top-down oficial (38×60 tiles @ 40px). */
export const BECO_DOS_FUNDOS_SCENE: SceneConfig = {
  id: 'beco_dos_fundos',
  mapId: FARM_ZONE_01_ID,
  displayName: 'Beco dos Fundos',
  tilesWide: DESIGN_CONFIG.MAP.MAX_TILES_WIDTH,
  tilesHigh: DESIGN_CONFIG.MAP.MAX_TILES_HEIGHT,
  tileSize: DESIGN_CONFIG.TILE.SIZE,
  mapPixelWidth: DESIGN_MAP_PIXEL_WIDTH,
  mapPixelHeight: DESIGN_MAP_PIXEL_HEIGHT,
  viewportWidth: DESIGN_CONFIG.VIEWPORT.WIDTH,
  viewportHeight: DESIGN_CONFIG.VIEWPORT.HEIGHT,
  visibleTilesWide: DESIGN_CONFIG.VISIBLE_TILES.WIDTH,
  visibleTilesHigh: DESIGN_CONFIG.VISIBLE_TILES.HEIGHT,
};

/** Cidade 01 — grade 40×40 @ 40px; câmera 16×9 tiles. */
export const CITY_01_SCENE: SceneConfig = {
  id: 'city_01',
  mapId: CITY_01_ID,
  displayName: 'Cidade 01',
  tilesWide: 40,
  tilesHigh: 40,
  tileSize: DESIGN_CONFIG.TILE.SIZE,
  mapPixelWidth: 40 * DESIGN_CONFIG.TILE.SIZE,
  mapPixelHeight: 40 * DESIGN_CONFIG.TILE.SIZE,
  viewportWidth: DESIGN_CONFIG.VIEWPORT.WIDTH,
  viewportHeight: DESIGN_CONFIG.VIEWPORT.HEIGHT,
  visibleTilesWide: DESIGN_CONFIG.VISIBLE_TILES.WIDTH,
  visibleTilesHigh: DESIGN_CONFIG.VISIBLE_TILES.HEIGHT,
};

export function resolveSceneConfigForMapId(mapId: string): SceneConfig | null {
  if (mapId === BECO_DOS_FUNDOS_SCENE.mapId) return BECO_DOS_FUNDOS_SCENE;
  if (mapId === CITY_01_SCENE.mapId) return CITY_01_SCENE;
  return null;
}
