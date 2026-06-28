import { DESIGN_CONFIG } from './designConstants.js';
import { DESIGN_SPRITE_DIMENSIONS, type SpriteDimensions } from './spriteDimensions.js';
import type { WorldPoint } from '../shared/world/playerEntity.js';

/** Pés do jogador na base do tile (32px) — posição lógica = centro do tile. */
export function getDesignPlayerFeetWorldY(position: WorldPoint): number {
  return position.y + DESIGN_CONFIG.TILE.SIZE / 2;
}

export function getEntityVisualBounds(
  position: WorldPoint,
  tileSize: number,
  dimensions: SpriteDimensions = DESIGN_SPRITE_DIMENSIONS,
): {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
} {
  const feetY = getEntityFeetWorldY(position, tileSize);
  return {
    x: position.x - dimensions.width / 2,
    y: feetY - dimensions.height,
    width: dimensions.width,
    height: dimensions.height,
  };
}

export function getDesignEntityVisualBounds(
  position: WorldPoint,
  dimensions: SpriteDimensions = DESIGN_SPRITE_DIMENSIONS,
  tileSize: number = DESIGN_CONFIG.TILE.SIZE,
): {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
} {
  return getEntityVisualBounds(position, tileSize, dimensions);
}

export function getDesignPlayerVisualBounds(position: WorldPoint): {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
} {
  return getDesignEntityVisualBounds(position, DESIGN_SPRITE_DIMENSIONS);
}

/** Centro visual do sprite — foco da câmera no Beco dos Fundos. */
export function getDesignPlayerVisualCenter(position: WorldPoint): WorldPoint {
  const bounds = getDesignPlayerVisualBounds(position);
  return {
    x: bounds.x + bounds.width / 2,
    y: bounds.y + bounds.height / 2,
  };
}

/** Pés na base do tile ativo — usa tileSize do mapa (32px oficial). */
export function getEntityFeetWorldY(position: WorldPoint, tileSize: number): number {
  return position.y + tileSize / 2;
}
