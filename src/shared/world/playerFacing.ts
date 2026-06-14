import type { MoveDirection } from './protocol.js';

/** Direções cardinais do Pivot — espelhadas pelo cliente a partir do servidor. */
export type PlayerFacing = 'north' | 'south' | 'east' | 'west';

export const PLAYER_FACING_ORDER: readonly PlayerFacing[] = [
  'south',
  'north',
  'east',
  'west',
] as const;

/** Chaves de rotação no metadata (8 direções). */
export type SpriteDirectionKey =
  | PlayerFacing
  | 'north-east'
  | 'north-west'
  | 'south-east'
  | 'south-west';

export function moveDirectionToFacing(direction: MoveDirection): PlayerFacing {
  switch (direction) {
    case 'up':
      return 'north';
    case 'down':
      return 'south';
    case 'left':
      return 'west';
    case 'right':
      return 'east';
  }
}

/** Facing cardinal dominante a partir de vetor normalizado. */
export function moveVectorToFacing(dx: number, dy: number): PlayerFacing {
  if (Math.abs(dx) >= Math.abs(dy)) {
    if (dx < 0) return 'west';
    if (dx > 0) return 'east';
    return dy < 0 ? 'north' : 'south';
  }
  return dy < 0 ? 'north' : 'south';
}

export function moveVectorToSpriteDirection(dx: number, dy: number): SpriteDirectionKey {
  const sx = dx === 0 ? 0 : dx > 0 ? 1 : -1;
  const sy = dy === 0 ? 0 : dy > 0 ? 1 : -1;

  if (sx === 0 && sy < 0) return 'north';
  if (sx === 0 && sy > 0) return 'south';
  if (sx < 0 && sy === 0) return 'west';
  if (sx > 0 && sy === 0) return 'east';
  if (sx < 0 && sy < 0) return 'north-west';
  if (sx > 0 && sy < 0) return 'north-east';
  if (sx < 0 && sy > 0) return 'south-west';
  return 'south-east';
}

export function facingToSpriteDirection(facing: PlayerFacing): SpriteDirectionKey {
  return facing;
}
