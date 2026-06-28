/**
 * Especificações técnicas canônicas do motor Altercadia.
 * Viewport, grid, mapa, hitbox do jogador e helpers de profundidade (Y-sort).
 */

export const GAME_CONFIG = {
  TILE_SIZE: 32,
  VIEWPORT_WIDTH: 640,
  VIEWPORT_HEIGHT: 360,
  MAP_WIDTH_TILES: 40,
  MAP_HEIGHT_TILES: 40,
  PLAYER_WIDTH: 35,
  PLAYER_HEIGHT: 54,
  /** Âncora do sprite — base central dos pés (pivot Phaser / drawImage). */
  PLAYER_FOOT_OFFSET: { x: 17.5, y: 54 },
} as const;

export type GameFootOffset = typeof GAME_CONFIG.PLAYER_FOOT_OFFSET;

/** Mapa em pixels — MAP_*_TILES × TILE_SIZE. */
export const GAME_MAP_WIDTH_PX = GAME_CONFIG.MAP_WIDTH_TILES * GAME_CONFIG.TILE_SIZE;
export const GAME_MAP_HEIGHT_PX = GAME_CONFIG.MAP_HEIGHT_TILES * GAME_CONFIG.TILE_SIZE;

/** Tiles visíveis no recorte fixo 640×360. */
export const GAME_VISIBLE_TILES_WIDTH = GAME_CONFIG.VIEWPORT_WIDTH / GAME_CONFIG.TILE_SIZE;
export const GAME_VISIBLE_TILES_HEIGHT = GAME_CONFIG.VIEWPORT_HEIGHT / GAME_CONFIG.TILE_SIZE;

/** Clamp do canto superior-esquerdo da câmera. */
export const GAME_CAMERA_SCROLL_MAX_X = GAME_MAP_WIDTH_PX - GAME_CONFIG.VIEWPORT_WIDTH;
export const GAME_CAMERA_SCROLL_MAX_Y = GAME_MAP_HEIGHT_PX - GAME_CONFIG.VIEWPORT_HEIGHT;

export type WorldLogicalPosition = {
  readonly x: number;
  readonly y: number;
};

/** Posição lógica (centro do tile) → X dos pés no mundo. */
export function resolvePlayerFeetWorldX(logicalX: number): number {
  return logicalX;
}

/**
 * Posição lógica → Y dos pés no chão do tile.
 * O sprite tem 54px de altura (> tile 32px); a profundidade usa os pés, não o topo.
 */
export function resolvePlayerFeetWorldY(logicalY: number): number {
  return logicalY + GAME_CONFIG.TILE_SIZE / 2;
}

export function resolvePlayerFeetWorld(logical: WorldLogicalPosition): WorldLogicalPosition {
  return {
    x: resolvePlayerFeetWorldX(logical.x),
    y: resolvePlayerFeetWorldY(logical.y),
  };
}

/** Depth Phaser / Y-sort — base dos pés (quanto maior Y, mais ao sul, mais na frente). */
export function resolvePlayerDepthY(logicalX: number, logicalY: number): number {
  void logicalX;
  return Math.floor(resolvePlayerFeetWorldY(logicalY));
}

export function resolveMapPixelSize(
  tilesWide: number = GAME_CONFIG.MAP_WIDTH_TILES,
  tilesHigh: number = GAME_CONFIG.MAP_HEIGHT_TILES,
  tileSize: number = GAME_CONFIG.TILE_SIZE,
): { readonly width: number; readonly height: number } {
  return {
    width: tilesWide * tileSize,
    height: tilesHigh * tileSize,
  };
}
