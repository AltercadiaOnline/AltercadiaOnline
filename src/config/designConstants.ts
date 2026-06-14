/**

 * Especificações oficiais e inalteráveis de design — Altercadia.

 *

 * VIEWPORT: 640×360 fixo. Escala na tela via transform: scale(min(w/640,h/360)) no #game-stage-scale.

 * GRID: tile 40×40 — posição em pixels = (tileX × 40, tileY × 40).

 * PLAYER: bounding box 35×54; âncora na base central (17.5, 54).

 * MAPA: 38×60 tiles = 1520×2400 px. CÂMERA clamp (0,0) … (880, 2040).

 */

export const DESIGN_CONFIG = {

  VIEWPORT: { WIDTH: 640, HEIGHT: 360 },

  TILE: { SIZE: 40 },

  PLAYER: {

    WIDTH: 35,

    HEIGHT: 54,

    PIVOT_X: 17.5,

    PIVOT_Y: 54,

  },

  MAP: {

    MAX_TILES_WIDTH: 38,

    MAX_TILES_HEIGHT: 60,

    WIDTH_PX: 38 * 40,

    HEIGHT_PX: 60 * 40,

  },

  /** Recorte fixo = 16×9 tiles visíveis (640÷40 × 360÷40). */

  VISIBLE_TILES: { WIDTH: 16, HEIGHT: 9 },

  CAMERA: {

    MIN_X: 0,

    MIN_Y: 0,

    MAX_X: 38 * 40 - 640,

    MAX_Y: 60 * 40 - 360,

  },

  SPRITE_TO_TILE: {

    WIDTH_RATIO: 35 / 40,

    HEIGHT_RATIO: 54 / 40,

    STEP_PX: 40,

  },

} as const;



/** Limite horizontal do mapa em pixels do mundo. */

export const DESIGN_MAP_PIXEL_WIDTH = DESIGN_CONFIG.MAP.WIDTH_PX;



/** Limite vertical do mapa em pixels do mundo. */

export const DESIGN_MAP_PIXEL_HEIGHT = DESIGN_CONFIG.MAP.HEIGHT_PX;



/** Canto máximo do scroll da câmera (canto superior-esquerdo do viewport). */

export const DESIGN_CAMERA_CLAMP_MAX_X = DESIGN_CONFIG.CAMERA.MAX_X;

export const DESIGN_CAMERA_CLAMP_MAX_Y = DESIGN_CONFIG.CAMERA.MAX_Y;



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

