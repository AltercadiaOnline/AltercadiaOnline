import {
  DESIGN_CONFIG,
  DESIGN_MAP_PIXEL_HEIGHT,
  DESIGN_MAP_PIXEL_WIDTH,
} from '../../config/designConstants.js';

/** Regra de ouro — limites fixos do mundo e do recorte (nunca window/canvas CSS). */
export const CAMERA_MAP_WIDTH_PX = DESIGN_MAP_PIXEL_WIDTH;
export const CAMERA_MAP_HEIGHT_PX = DESIGN_MAP_PIXEL_HEIGHT;
export const CAMERA_VIEW_WIDTH_PX = DESIGN_CONFIG.VIEWPORT.WIDTH;
export const CAMERA_VIEW_HEIGHT_PX = DESIGN_CONFIG.VIEWPORT.HEIGHT;

/** Viewport fixo — nunca deriva da janela do navegador. */
export const CAMERA_VIEWPORT_WIDTH = CAMERA_VIEW_WIDTH_PX;
export const CAMERA_VIEWPORT_HEIGHT = CAMERA_VIEW_HEIGHT_PX;

export const CAMERA_VIEWPORT_HALF_WIDTH = CAMERA_VIEWPORT_WIDTH / 2;
export const CAMERA_VIEWPORT_HALF_HEIGHT = CAMERA_VIEWPORT_HEIGHT / 2;

export const CAMERA_TILE_SIZE: number = DESIGN_CONFIG.TILE.SIZE;

export type MapTotalPixels = {
  readonly width: number;
  readonly height: number;
};

export type CameraClampLimits = {
  readonly maxCameraX: number;
  readonly maxCameraY: number;
};

/** MapaTotal = mapWidthInTiles × 40 */
export function computeMapTotalPixels(
  tilesWide: number,
  tilesHigh: number,
  tileSize = CAMERA_TILE_SIZE,
): MapTotalPixels {
  return {
    width: tilesWide * tileSize,
    height: tilesHigh * tileSize,
  };
}

/**
 * Limites máximos do canto superior-esquerdo da câmera:
 * maxCameraX = (mapWidthInTiles * 40) - viewportWidth
 * maxCameraY = (mapHeightInTiles * 40) - viewportHeight
 */
export function computeCameraClampLimits(
  mapWidthInTiles: number,
  mapHeightInTiles: number,
): CameraClampLimits {
  return {
    maxCameraX: mapWidthInTiles * CAMERA_TILE_SIZE - CAMERA_VIEWPORT_WIDTH,
    maxCameraY: mapHeightInTiles * CAMERA_TILE_SIZE - CAMERA_VIEWPORT_HEIGHT,
  };
}

export function computeCameraClampLimitsFromPixels(
  mapTotalWidth: number,
  mapTotalHeight: number,
): CameraClampLimits {
  return {
    maxCameraX: Math.max(0, mapTotalWidth - CAMERA_VIEW_WIDTH_PX),
    maxCameraY: Math.max(0, mapTotalHeight - CAMERA_VIEW_HEIGHT_PX),
  };
}

/** Clamp oficial do mapa design (38×60 tiles = 1520×2400). */
export function clampCameraToDesignMap(
  playerX: number,
  playerY: number,
): { readonly x: number; readonly y: number } {
  return clampCameraToPlayerFollow(
    playerX,
    playerY,
    CAMERA_MAP_WIDTH_PX,
    CAMERA_MAP_HEIGHT_PX,
  );
}

/**
 * Fórmula oficial:
 * camera.x = max(0, min(player.x - viewportWidth/2, maxCameraX))
 * camera.y = max(0, min(player.y - viewportHeight/2, maxCameraY))
 */
export function clampCameraToPlayerFollow(
  playerX: number,
  playerY: number,
  mapTotalWidth: number,
  mapTotalHeight: number,
): { readonly x: number; readonly y: number } {
  const { maxCameraX, maxCameraY } = computeCameraClampLimitsFromPixels(
    mapTotalWidth,
    mapTotalHeight,
  );

  return {
    x: Math.max(0, Math.min(playerX - CAMERA_VIEWPORT_HALF_WIDTH, maxCameraX)),
    y: Math.max(0, Math.min(playerY - CAMERA_VIEWPORT_HALF_HEIGHT, maxCameraY)),
  };
}

/** Variante por tiles — mesma fórmula com mapWidthInTiles × 40. */
export function clampCameraToPlayerFollowTiles(
  playerX: number,
  playerY: number,
  mapWidthInTiles: number,
  mapHeightInTiles: number,
): { readonly x: number; readonly y: number } {
  const map = computeMapTotalPixels(mapWidthInTiles, mapHeightInTiles);
  return clampCameraToPlayerFollow(playerX, playerY, map.width, map.height);
}
