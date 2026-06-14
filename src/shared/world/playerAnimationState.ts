import type { PlayerFacing } from './playerFacing.js';

export type PlayerAnimState = 'IDLE' | 'WALK';

export type PlayerAnimDirection = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

export type PlayerAnimationSnapshot = {
  readonly state: PlayerAnimState;
  readonly direction: PlayerAnimDirection;
};

export type ResolvePlayerAnimationOptions = {
  readonly lastDirection: PlayerAnimDirection;
  readonly idleEpsilon?: number;
};

export const PLAYER_ANIM_IDLE_EPSILON = 0.1;

export function facingToAnimDirection(facing: PlayerFacing): PlayerAnimDirection {
  switch (facing) {
    case 'north':
      return 'UP';
    case 'south':
      return 'DOWN';
    case 'west':
      return 'LEFT';
    case 'east':
      return 'RIGHT';
  }
}

export function animDirectionToFacing(direction: PlayerAnimDirection): PlayerFacing {
  switch (direction) {
    case 'UP':
      return 'north';
    case 'DOWN':
      return 'south';
    case 'LEFT':
      return 'west';
    case 'RIGHT':
      return 'east';
  }
}

export function resolveAnimDirectionFromVelocity(
  velocityX: number,
  velocityY: number,
  fallback: PlayerAnimDirection,
): PlayerAnimDirection {
  if (Math.abs(velocityX) < 1e-6 && Math.abs(velocityY) < 1e-6) {
    return fallback;
  }
  if (Math.abs(velocityX) >= Math.abs(velocityY)) {
    return velocityX < 0 ? 'LEFT' : 'RIGHT';
  }
  return velocityY < 0 ? 'UP' : 'DOWN';
}

export function resolvePlayerAnimationState(
  velocity: { readonly x: number; readonly y: number },
  options: ResolvePlayerAnimationOptions,
): PlayerAnimationSnapshot {
  const idleEpsilon = options.idleEpsilon ?? PLAYER_ANIM_IDLE_EPSILON;
  const speed = Math.hypot(velocity.x, velocity.y);

  if (speed < idleEpsilon) {
    return { state: 'IDLE', direction: options.lastDirection };
  }

  const direction = resolveAnimDirectionFromVelocity(
    velocity.x,
    velocity.y,
    options.lastDirection,
  );

  return { state: 'WALK', direction };
}
