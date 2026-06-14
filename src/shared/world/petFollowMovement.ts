import { TILE_SIZE } from './mapConstants.js';
import type { PlayerFacing } from './playerFacing.js';
import { moveVectorToFacing } from './playerFacing.js';
import { getPetCollisionPoint } from './petEntity.js';
import {
  clampFrameDeltaMs,
  PLAYER_MOVE_COLLISION_SUBSTEP_PX,
  PLAYER_MOVE_SPEED_PX_PER_SEC,
  type WorldPosition,
} from './movement.js';
import { canWalkAt } from './worldMap.js';

/** Distância alvo atrás/lateral do operativo (curta e constante). */
export const PET_FOLLOW_OFFSET_PX = TILE_SIZE * 0.78;

/** Velocidade de catch-up — levemente mais lenta que o jogador. */
export const PET_FOLLOW_SPEED_PX_PER_SEC = PLAYER_MOVE_SPEED_PX_PER_SEC * 0.9;

/** Distância em que o pet para de se deslocar e espelha o facing do jogador. */
export const PET_FOLLOW_ARRIVAL_PX = TILE_SIZE * 0.12;

/** Teleporte suave se ficar muito longe (mapa grande / canto). */
export const PET_FOLLOW_SNAP_DISTANCE_PX = TILE_SIZE * 3.5;

export type PetFollowState = {
  readonly x: number;
  readonly y: number;
  readonly facing: PlayerFacing;
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max));
}

export function canPetWalkAt(mapData: number[][], position: WorldPosition): boolean {
  const feet = getPetCollisionPoint(position);
  return canWalkAt(mapData, feet.x, feet.y);
}

export function canPetStepTo(
  mapData: number[][],
  from: WorldPosition,
  to: WorldPosition,
): boolean {
  if (!canPetWalkAt(mapData, to)) return false;

  const stepX = to.x - from.x;
  const stepY = to.y - from.y;
  if (stepX !== 0 && stepY !== 0) {
    if (!canPetWalkAt(mapData, { x: from.x + stepX, y: from.y })) return false;
    if (!canPetWalkAt(mapData, { x: from.x, y: from.y + stepY })) return false;
  }

  return true;
}

export function movePetByDelta(
  position: WorldPosition,
  deltaX: number,
  deltaY: number,
  mapData: number[][],
  pixelWidth: number,
  pixelHeight: number,
  maxSubStepPx = PLAYER_MOVE_COLLISION_SUBSTEP_PX,
): WorldPosition {
  let { x, y } = position;
  const totalDist = Math.hypot(deltaX, deltaY);
  if (totalDist <= 0) return position;

  const steps = Math.max(1, Math.ceil(totalDist / maxSubStepPx));
  const stepX = deltaX / steps;
  const stepY = deltaY / steps;

  for (let i = 0; i < steps; i += 1) {
    const nextX = clamp(x + stepX, 0, pixelWidth);
    const nextY = clamp(y + stepY, 0, pixelHeight);
    const from = { x, y };
    const candidate = { x: nextX, y: nextY };

    if (canPetStepTo(mapData, from, candidate)) {
      x = nextX;
      y = nextY;
      continue;
    }

    if (stepX !== 0 && canPetStepTo(mapData, from, { x: nextX, y })) {
      x = nextX;
      continue;
    }

    if (stepY !== 0 && canPetStepTo(mapData, from, { x, y: nextY })) {
      y = nextY;
    }
  }

  return { x, y };
}

/**
 * Posição desejada do pet em relação ao facing do operativo.
 * Norte = y menor; pet fica "atrás" (oposto ao olhar).
 */
export function resolvePetFollowAnchor(
  playerPosition: WorldPosition,
  playerFacing: PlayerFacing,
  offsetMult = 1,
): WorldPosition {
  const offset = PET_FOLLOW_OFFSET_PX * offsetMult;
  switch (playerFacing) {
    case 'north':
      return { x: playerPosition.x, y: playerPosition.y + offset };
    case 'south':
      return { x: playerPosition.x, y: playerPosition.y - offset };
    case 'east':
      return { x: playerPosition.x - offset, y: playerPosition.y };
    case 'west':
      return { x: playerPosition.x + offset, y: playerPosition.y };
  }
}

export type TickPetFollowInput = {
  readonly pet: PetFollowState;
  readonly playerPosition: WorldPosition;
  readonly playerFacing: PlayerFacing;
  readonly mapData: number[][];
  readonly pixelWidth: number;
  readonly pixelHeight: number;
  readonly deltaMs: number;
  readonly followSpeedMult?: number;
  readonly followOffsetMult?: number;
};

export function tickPetFollow(input: TickPetFollowInput): PetFollowState {
  const deltaMs = clampFrameDeltaMs(input.deltaMs);
  const speedMult = input.followSpeedMult ?? 1;
  const offsetMult = input.followOffsetMult ?? 1;
  const anchor = resolvePetFollowAnchor(input.playerPosition, input.playerFacing, offsetMult);
  const dx = anchor.x - input.pet.x;
  const dy = anchor.y - input.pet.y;
  const distance = Math.hypot(dx, dy);

  if (distance >= PET_FOLLOW_SNAP_DISTANCE_PX) {
    const snapped = canPetWalkAt(input.mapData, anchor)
      ? anchor
      : input.pet;
    return {
      x: snapped.x,
      y: snapped.y,
      facing: input.playerFacing,
    };
  }

  if (distance <= PET_FOLLOW_ARRIVAL_PX) {
    return {
      x: input.pet.x,
      y: input.pet.y,
      facing: input.playerFacing,
    };
  }

  const speed = PET_FOLLOW_SPEED_PX_PER_SEC * speedMult * (deltaMs / 1000);
  const moveX = (dx / distance) * Math.min(speed, distance);
  const moveY = (dy / distance) * Math.min(speed, distance);
  const next = movePetByDelta(
    input.pet,
    moveX,
    moveY,
    input.mapData,
    input.pixelWidth,
    input.pixelHeight,
  );

  const movedDx = next.x - input.pet.x;
  const movedDy = next.y - input.pet.y;
  const facing = Math.hypot(movedDx, movedDy) > 0.05
    ? moveVectorToFacing(movedDx, movedDy)
    : input.playerFacing;

  return {
    x: next.x,
    y: next.y,
    facing,
  };
}
