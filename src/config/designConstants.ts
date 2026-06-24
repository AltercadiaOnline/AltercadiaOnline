import {
  GAME_CAMERA_SCROLL_MAX_X,
  GAME_CAMERA_SCROLL_MAX_Y,
  GAME_CONFIG,
  GAME_MAP_HEIGHT_PX,
  GAME_MAP_WIDTH_PX,
  GAME_VISIBLE_TILES_HEIGHT,
  GAME_VISIBLE_TILES_WIDTH,
} from '../game/constants/GameConfig.js';

/**
 * Especificações oficiais e inalteráveis de design — Altercadia.
 * Fonte canônica: `src/game/constants/GameConfig.ts`.
 *
 * VIEWPORT: 640×360 fixo. Escala na tela via transform: scale(min(w/640,h/360)) no #game-stage-scale.
 * GRID: tile 40×40 — posição em pixels = (tileX × 40, tileY × 40).
 * PLAYER: bounding box 35×54; âncora na base central (17.5, 54).
 * MAPA: 38×60 tiles = 1520×2400 px. CÂMERA clamp (0,0) … (880, 2040).
 */

export const DESIGN_CONFIG = {
  VIEWPORT: {
    WIDTH: GAME_CONFIG.VIEWPORT_WIDTH,
    HEIGHT: GAME_CONFIG.VIEWPORT_HEIGHT,
  },
  TILE: { SIZE: GAME_CONFIG.TILE_SIZE },
  PLAYER: {
    WIDTH: GAME_CONFIG.PLAYER_WIDTH,
    HEIGHT: GAME_CONFIG.PLAYER_HEIGHT,
    PIVOT_X: GAME_CONFIG.PLAYER_FOOT_OFFSET.x,
    PIVOT_Y: GAME_CONFIG.PLAYER_FOOT_OFFSET.y,
  },
  MAP: {
    MAX_TILES_WIDTH: GAME_CONFIG.MAP_WIDTH_TILES,
    MAX_TILES_HEIGHT: GAME_CONFIG.MAP_HEIGHT_TILES,
    WIDTH_PX: GAME_MAP_WIDTH_PX,
    HEIGHT_PX: GAME_MAP_HEIGHT_PX,
  },
  VISIBLE_TILES: {
    WIDTH: GAME_VISIBLE_TILES_WIDTH,
    HEIGHT: GAME_VISIBLE_TILES_HEIGHT,
  },
  CAMERA: {
    MIN_X: 0,
    MIN_Y: 0,
    MAX_X: GAME_CAMERA_SCROLL_MAX_X,
    MAX_Y: GAME_CAMERA_SCROLL_MAX_Y,
  },
  SPRITE_TO_TILE: {
    WIDTH_RATIO: GAME_CONFIG.PLAYER_WIDTH / GAME_CONFIG.TILE_SIZE,
    HEIGHT_RATIO: GAME_CONFIG.PLAYER_HEIGHT / GAME_CONFIG.TILE_SIZE,
    STEP_PX: GAME_CONFIG.TILE_SIZE,
  },
} as const;

/** Limite horizontal do mapa em pixels do mundo. */
export const DESIGN_MAP_PIXEL_WIDTH = GAME_MAP_WIDTH_PX;

/** Limite vertical do mapa em pixels do mundo. */
export const DESIGN_MAP_PIXEL_HEIGHT = GAME_MAP_HEIGHT_PX;

/** Canto máximo do scroll da câmera (canto superior-esquerdo do viewport). */
export const DESIGN_CAMERA_CLAMP_MAX_X = GAME_CAMERA_SCROLL_MAX_X;
export const DESIGN_CAMERA_CLAMP_MAX_Y = GAME_CAMERA_SCROLL_MAX_Y;

/** Converte índice de tile da grade → origem em pixels do mundo (canto superior-esquerdo). */
export function tileGridToWorldOrigin(tileX: number, tileY: number): {
  readonly x: number;
  readonly y: number;
} {
  return {
    x: tileX * DESIGN_CONFIG.TILE.SIZE,
    y: tileY * DESIGN_CONFIG.TILE.SIZE,
  };
}
