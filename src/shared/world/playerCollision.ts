import { DESIGN_CONFIG } from '../../config/designConstants.js';
import type { AxisAlignedHitbox } from './axisAlignedHitbox.js';
import { hitboxesOverlap } from './axisAlignedHitbox.js';
import {
  circleOverlapsAabb,
  resolveCircleAabbSeparation,
  type CircleHitbox,
  type CircleSeparationOptions,
} from './circleHitbox.js';
import {
  circleOverlapsPolygon,
  resolveCirclePolygonSeparation,
  type PolygonHitbox,
} from './polygonHitbox.js';
import type { WorldPoint } from './playerEntity.js';
import { resolvePlayerVisualBounds } from './playerVisualContract.js';
import { getActiveWorldCollisionObstacles } from './worldCollisionRegistry.js';
import type { WorldCollisionObstacle } from './worldCollisionObstacle.js';

/** Hitbox completa do personagem (35×54) — render e debug. */
export type PlayerHitbox = AxisAlignedHitbox;

/**
 * Colisão de movimento — círculo nos pés (contorna quinas melhor que AABB).
 * Raio ~ metade da base útil do sprite; corpo alto não bloqueia passagem lateral.
 */
const MOVEMENT_FEET_RADIUS = 7;
const MOVEMENT_FEET_LIFT_PX = 2;

/**
 * Contato raso (≤ slop) não bloqueia — permite deslizar encostado no Solid
 * sem depenetration empurrando pra trás a cada frame.
 */
export const MOVEMENT_COLLISION_SLOP_PX = 0.4;

/** Folga pós-separação — evita re-penetrar no próximo substep. */
export const MOVEMENT_COLLISION_SKIN_PX = 0.55;

const MOVEMENT_SEPARATION: CircleSeparationOptions = {
  slopPx: MOVEMENT_COLLISION_SLOP_PX,
  skinPx: MOVEMENT_COLLISION_SKIN_PX,
};

const MOVEMENT_BLOCK: CircleSeparationOptions = {
  slopPx: MOVEMENT_COLLISION_SLOP_PX,
  skinPx: 0,
};

export function resolvePlayerHitbox(position: WorldPoint): PlayerHitbox {
  return resolvePlayerVisualBounds(position);
}

/** @deprecated Prefer `resolvePlayerMovementCircle` — AABB legado para debug. */
export function resolvePlayerMovementHitbox(position: WorldPoint): PlayerHitbox {
  const circle = resolvePlayerMovementCircle(position);
  const diameter = circle.radius * 2;
  return {
    x: circle.cx - circle.radius,
    y: circle.cy - circle.radius,
    width: diameter,
    height: diameter,
  };
}

/** Círculo de colisão ancorado na base do personagem (tile center = position.x). */
export function resolvePlayerMovementCircle(position: WorldPoint): CircleHitbox {
  const full = resolvePlayerHitbox(position);
  const feetY = full.y + full.height - MOVEMENT_FEET_LIFT_PX;
  return {
    cx: position.x,
    cy: feetY,
    radius: MOVEMENT_FEET_RADIUS,
  };
}

function obstaclePolygon(obstacle: WorldCollisionObstacle): PolygonHitbox | null {
  if (!obstacle.polygon || obstacle.polygon.length < 3) return null;
  return { points: obstacle.polygon, bounds: obstacle.hitbox };
}

export function playerCircleOverlapsObstacle(
  circle: CircleHitbox,
  obstacle: WorldCollisionObstacle,
  options: CircleSeparationOptions = MOVEMENT_BLOCK,
): boolean {
  const poly = obstaclePolygon(obstacle);
  if (poly) return circleOverlapsPolygon(circle, poly, options);
  return circleOverlapsAabb(circle, obstacle.hitbox, options);
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
  const circle = resolvePlayerMovementCircle(position);
  for (const obstacle of obstacles) {
    if (playerCircleOverlapsObstacle(circle, obstacle, MOVEMENT_BLOCK)) return true;
  }
  return false;
}

function resolveObstacleMtv(
  circle: CircleHitbox,
  obstacle: WorldCollisionObstacle,
): { readonly dx: number; readonly dy: number } | null {
  const poly = obstaclePolygon(obstacle);
  if (poly) {
    return resolveCirclePolygonSeparation(circle, poly, MOVEMENT_SEPARATION);
  }
  return resolveCircleAabbSeparation(circle, obstacle.hitbox, MOVEMENT_SEPARATION);
}

/**
 * Corrige sobreposição residual empurrando o círculo para fora
 * (polígono Construct nos props; AABB nos NPCs).
 * Resolve o MTV mais profundo por iteração — evita “teleporte” por empurrões cruzados.
 */
export function depenetratePlayerMovementCircle(
  position: WorldPoint,
  obstacles: readonly WorldCollisionObstacle[] = getActiveWorldCollisionObstacles(),
): WorldPoint {
  if (obstacles.length === 0) return position;

  const circle = resolvePlayerMovementCircle(position);
  let cx = circle.cx;
  let cy = circle.cy;
  const { radius } = circle;

  for (let iteration = 0; iteration < 4; iteration += 1) {
    let best: { dx: number; dy: number; depth: number } | null = null;
    for (const obstacle of obstacles) {
      const mtv = resolveObstacleMtv({ cx, cy, radius }, obstacle);
      if (!mtv) continue;
      const depth = Math.hypot(mtv.dx, mtv.dy);
      if (!best || depth > best.depth) {
        best = { dx: mtv.dx, dy: mtv.dy, depth };
      }
    }
    if (!best) break;
    cx += best.dx;
    cy += best.dy;
  }

  if (cx === circle.cx && cy === circle.cy) {
    return position;
  }

  const full = resolvePlayerHitbox(position);
  const feetY = full.y + full.height - MOVEMENT_FEET_LIFT_PX;
  return {
    x: cx,
    y: position.y + (cy - feetY),
  };
}

/**
 * Pontos amostrados na base — validação de tiles bloqueantes (legacy).
 */
export function resolvePlayerWalkabilitySamplePoints(
  position: WorldPoint,
  tileSize: number = DESIGN_CONFIG.TILE.SIZE,
): readonly WorldPoint[] {
  const circle = resolvePlayerMovementCircle(position);
  const feetY = circle.cy;
  const span = circle.radius * 0.85;
  return [
    { x: circle.cx - span, y: feetY },
    { x: circle.cx, y: feetY },
    { x: circle.cx + span, y: feetY },
    { x: position.x, y: position.y + tileSize / 2 - 1 },
  ];
}
