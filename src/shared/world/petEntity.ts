import { TILE_SIZE } from './mapConstants.js';
import type { WorldPoint } from './playerEntity.js';

/** Sprite compacta do pet — ~75% de um tile. */
export const PET_VISUAL_SIZE_PX = 48;
export const PET_RENDER_FLOOR_OFFSET_Y = TILE_SIZE * 0.35;
export const PET_COLLISION_OFFSET: Readonly<WorldPoint> = { x: 0, y: 2 };

export function getPetCollisionPoint(position: WorldPoint): WorldPoint {
  return {
    x: position.x + PET_COLLISION_OFFSET.x,
    y: position.y + PET_COLLISION_OFFSET.y,
  };
}

export function getPetFeetWorldY(position: WorldPoint): number {
  return position.y + PET_RENDER_FLOOR_OFFSET_Y + PET_COLLISION_OFFSET.y;
}

export function getPetDepthY(position: WorldPoint): number {
  return getPetFeetWorldY(position);
}

export function getPetVisualBounds(position: WorldPoint): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  const feetY = getPetFeetWorldY(position);
  return {
    x: position.x - PET_VISUAL_SIZE_PX / 2,
    y: feetY - PET_VISUAL_SIZE_PX,
    width: PET_VISUAL_SIZE_PX,
    height: PET_VISUAL_SIZE_PX,
  };
}
