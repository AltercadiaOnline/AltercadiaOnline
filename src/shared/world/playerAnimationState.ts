import type { PlayerFacing } from './playerFacing.js';
import { moveVectorToFacing } from './playerFacing.js';

export type PlayerAnimState = 'IDLE' | 'WALK';

export type PlayerAnimDirection = PlayerFacing;

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
  return facing;
}

export function animDirectionToFacing(direction: PlayerAnimDirection): PlayerFacing {
  return direction;
}

export function resolveAnimDirectionFromVelocity(
  velocityX: number,
  velocityY: number,
  fallback: PlayerAnimDirection,
): PlayerAnimDirection {
  if (Math.abs(velocityX) < 1e-6 && Math.abs(velocityY) < 1e-6) {
    return fallback;
  }
  return moveVectorToFacing(velocityX, velocityY);
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
