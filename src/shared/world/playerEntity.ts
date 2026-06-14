import { TILE_SIZE } from './mapConstants.js';

/** Altura visual ~2 tiles (124px) — colisão permanece 1 tile (64×64). */
export const PLAYER_VISUAL_HEIGHT_PX = 124;
export const PLAYER_VISUAL_HEIGHT_RATIO = PLAYER_VISUAL_HEIGHT_PX / TILE_SIZE;

/** Margem inferior visual — pés ancorados na base do tile lógico. */
export const PLAYER_TILE_MARGIN_TOP = 0;
export const PLAYER_TILE_MARGIN_BOTTOM = 4;

/**
 * Offset só de renderização: posição lógica usa centro do tile;
 * o desenho desce meio tile para alinhar os pés ao chão do tile.
 */
export const PLAYER_RENDER_FLOOR_OFFSET_Y = TILE_SIZE * 0.5;

export const PLAYER_VISUAL_HEIGHT = PLAYER_VISUAL_HEIGHT_PX;
export const PLAYER_VISUAL_WIDTH = PLAYER_VISUAL_HEIGHT;

/** Fator de escala visual em relação ao tile (~1,94×). */
export const PLAYER_RENDER_SCALE = PLAYER_VISUAL_HEIGHT_RATIO;

export type WorldPoint = {
  x: number;
  y: number;
};

/**
 * Posição lógica (x, y) = centro do tile na grade.
 * Colisão permanece na grade; o desenho usa pés na base do tile.
 */
export const PLAYER_COLLISION_OFFSET: Readonly<WorldPoint> = {
  x: 0,
  y: PLAYER_TILE_MARGIN_BOTTOM,
};

export function getPlayerCollisionPoint(position: WorldPoint): WorldPoint {
  return {
    x: position.x + PLAYER_COLLISION_OFFSET.x,
    y: position.y + PLAYER_COLLISION_OFFSET.y,
  };
}

/** Pés do personagem no chão visual do tile (sem alterar colisão). */
export function getPlayerFeetWorldY(position: WorldPoint): number {
  return position.y + PLAYER_RENDER_FLOOR_OFFSET_Y + PLAYER_COLLISION_OFFSET.y;
}

export function getPlayerDepthY(position: WorldPoint): number {
  return getPlayerFeetWorldY(position);
}

export function getPlayerVisualBounds(position: WorldPoint): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  const feetY = getPlayerFeetWorldY(position);
  return {
    x: position.x - PLAYER_VISUAL_WIDTH / 2,
    y: feetY - PLAYER_VISUAL_HEIGHT - PLAYER_TILE_MARGIN_BOTTOM,
    width: PLAYER_VISUAL_WIDTH,
    height: PLAYER_VISUAL_HEIGHT,
  };
}

/** Centro do sprite visual (~2 tiles) — foco da câmera. */
export function getPlayerVisualCenter(position: WorldPoint): WorldPoint {
  const bounds = getPlayerVisualBounds(position);
  return {
    x: bounds.x + bounds.width / 2,
    y: bounds.y + bounds.height / 2,
  };
}

/** @deprecated Use PLAYER_VISUAL_HEIGHT — mantido para imports legados. */
export const PLAYER_RENDER_SIZE = PLAYER_VISUAL_HEIGHT;
