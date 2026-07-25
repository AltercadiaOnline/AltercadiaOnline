import type { AxisAlignedHitbox } from './axisAlignedHitbox.js';
import type { PolygonVertex } from './polygonHitbox.js';

export type WorldCollisionObstacleKind = 'prop' | 'npc';

/**
 * Obstáculo estático do cenário.
 * - `prop`: polígono Solid do Construct (`polygon`) + AABB broadphase (`hitbox`)
 * - `npc`: AABB gerado por nós (`hitbox` only) — criaturas não bloqueiam movimento
 */
export type WorldCollisionObstacle = {
  readonly id: string;
  readonly kind: WorldCollisionObstacleKind;
  /** Broadphase / hitbox NPC — para props = AABB do polígono Construct. */
  readonly hitbox: AxisAlignedHitbox;
  /** Polígono Solid Construct em world px. Só props. */
  readonly polygon?: readonly PolygonVertex[];
};
