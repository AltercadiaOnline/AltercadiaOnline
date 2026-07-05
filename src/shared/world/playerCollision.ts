import { DESIGN_CONFIG } from '../../config/designConstants.js';
import type { AxisAlignedHitbox } from './axisAlignedHitbox.js';
import { hitboxesOverlap } from './axisAlignedHitbox.js';
import type { WorldPoint } from './playerEntity.js';
import { resolvePlayerVisualBounds } from './playerVisualContract.js';
import { getActiveWorldCollisionObstacles } from './worldCollisionRegistry.js';
import type { WorldCollisionObstacle } from './worldCollisionObstacle.js';

/** Hitbox completa do personagem (35×54) — render e debug. */
export type PlayerHitbox = AxisAlignedHitbox;

/**
 * Hitbox de movimento — mais estreita na base para passar entre postes
 * sem atravessar props sólidos (metade inferior do sprite).
 */
const MOVEMENT_HITBOX_INSET_X = 8;
const MOVEMENT_HITBOX_INSET_TOP = 24;

export function resolvePlayerHitbox(position: WorldPoint): PlayerHitbox {
  return resolvePlayerVisualBounds(position);
}

export function resolvePlayerMovementHitbox(position: WorldPoint): PlayerHitbox {
  const full = resolvePlayerHitbox(position);
  return {
    x: full.x + MOVEMENT_HITBOX_INSET_X,
    y: full.y + MOVEMENT_HITBOX_INSET_TOP,
    width: Math.max(1, full.width - MOVEMENT_HITBOX_INSET_X * 2),
    height: Math.max(1, full.height - MOVEMENT_HITBOX_INSET_TOP),
  };
}

export function playerHitboxOverlapsObstacle(
  hitbox: PlayerHitbox,
  obstacle: WorldCollisionObstacle,
): boolean {
  return hitboxesOverlap(hitbox, obstacle.hitbox);
}

export function playerHitboxOverlapsAnyObstacle(
  hitbox: PlayerHitbox,
  obstacles: readonly WorldCollisionObstacle[],
): boolean {
  for (const obstacle of obstacles) {
    if (playerHitboxOverlapsObstacle(hitbox, obstacle)) return true;
  }
  return false;
}

export function isPlayerBlockedByObstacles(
  position: WorldPoint,
  obstacles: readonly WorldCollisionObstacle[] = getActiveWorldCollisionObstacles(),
): boolean {
  if (obstacles.length === 0) return false;
  const hitbox = resolvePlayerMovementHitbox(position);
  return playerHitboxOverlapsAnyObstacle(hitbox, obstacles);
}

/**
 * Pontos amostrados na base da hitbox — validação de tiles bloqueantes.
 * position.y = centro do tile lógico; pés na base do tile ativo.
 */
export function resolvePlayerWalkabilitySamplePoints(
  position: WorldPoint,
  tileSize: number = DESIGN_CONFIG.TILE.SIZE,
): readonly WorldPoint[] {
  const hitbox = resolvePlayerMovementHitbox(position);
  const feetY = hitbox.y + hitbox.height - 1;
  return [
    { x: hitbox.x + hitbox.width * 0.25, y: feetY },
    { x: hitbox.x + hitbox.width * 0.5, y: feetY },
    { x: hitbox.x + hitbox.width * 0.75, y: feetY },
    { x: position.x, y: position.y + tileSize / 2 - 1 },
  ];
}
