import type { InteractableDefinition } from './interactableRegistry.js';
import { INTERACTION_RADIUS_TILES } from './interactableRegistry.js';
import { worldPixelToTile } from './portals.js';

export function tileDistanceFromWorldPixels(
  worldX: number,
  worldY: number,
  tileX: number,
  tileY: number,
): number {
  const player = worldPixelToTile(worldX, worldY);
  return Math.hypot(player.tileX - tileX, player.tileY - tileY);
}

export function isWithinInteractionRadius(
  playerWorldX: number,
  playerWorldY: number,
  target: Pick<InteractableDefinition, 'tileX' | 'tileY'>,
  radiusTiles = INTERACTION_RADIUS_TILES,
): boolean {
  return tileDistanceFromWorldPixels(
    playerWorldX,
    playerWorldY,
    target.tileX,
    target.tileY,
  ) <= radiusTiles;
}
