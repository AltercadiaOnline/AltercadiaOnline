import { DESIGN_CONFIG } from '../../config/designConstants.js';
import { getEntityFeetWorldY, getEntityVisualBounds } from '../../config/playerDesignAnchoring.js';
import { DESIGN_SPRITE_DIMENSIONS } from '../../config/spriteDimensions.js';

import type { WorldPoint } from './playerEntity.js';

/** @deprecated Desenho 1:1 via drawImage1To1AtFeet — colisão permanece 35×54. */
export const PLAYER_VISUAL_DRAW_SCALE = 1;

export const PLAYER_VISUAL_DRAW_WIDTH = DESIGN_CONFIG.PLAYER.WIDTH;
export const PLAYER_VISUAL_DRAW_HEIGHT = DESIGN_CONFIG.PLAYER.HEIGHT;

/**
 * Contrato visual único — DESIGN_CONFIG.PLAYER (35×54, âncora 17.5/54).
 * Fonte da verdade: DESIGN_CONFIG — sem escala por mapa ou janela.
 */
export function resolvePlayerSpriteDimensions(): {
  readonly width: number;
  readonly height: number;
} {
  return DESIGN_SPRITE_DIMENSIONS;
}

export function resolvePlayerVisualBounds(position: WorldPoint): {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
} {
  return getEntityVisualBounds(
    position,
    DESIGN_CONFIG.TILE.SIZE,
    DESIGN_SPRITE_DIMENSIONS,
  );
}

export function resolvePlayerCollisionPoint(position: WorldPoint): WorldPoint {
  return {
    x: position.x,
    y: getEntityFeetWorldY(position, DESIGN_CONFIG.TILE.SIZE),
  };
}

/**
 * @deprecated Desenho usa PNG 1:1 em drawImage1To1AtFeet — não escalar para este retângulo.
 * Colisão/hitbox: resolvePlayerVisualBounds (35×54).
 */
export function resolvePlayerVisualDrawRect(collisionBounds: {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}): {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
} {
  const feetY = collisionBounds.y + collisionBounds.height;
  const centerX = collisionBounds.x + collisionBounds.width / 2;

  return {
    x: centerX - PLAYER_VISUAL_DRAW_WIDTH / 2,
    y: feetY - PLAYER_VISUAL_DRAW_HEIGHT,
    width: PLAYER_VISUAL_DRAW_WIDTH,
    height: PLAYER_VISUAL_DRAW_HEIGHT,
  };
}
