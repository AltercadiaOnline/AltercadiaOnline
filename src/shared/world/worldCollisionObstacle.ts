import type { AxisAlignedHitbox } from './axisAlignedHitbox.js';

export type WorldCollisionObstacleKind = 'tiled_prop' | 'npc';

/** Obstáculo estático do cenário — props Tiled e NPCs com colisão. */
export type WorldCollisionObstacle = {
  readonly id: string;
  readonly kind: WorldCollisionObstacleKind;
  readonly hitbox: AxisAlignedHitbox;
};
