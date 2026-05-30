import type { MoveDirection } from './protocol.js';
import { PLAYER_MOVE_STEP } from './protocol.js';
import { canWalkAt, mapPixelHeight, mapPixelWidth } from './worldMap.js';

export type WorldPosition = {
  x: number;
  y: number;
};

const DELTA: Record<MoveDirection, { dx: number; dy: number }> = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
};

/** Autoridade de movimento — usada pelo servidor e pelo mock local. */
export function applyMove(
  position: WorldPosition,
  direction: MoveDirection,
  mapData: number[][],
  step = PLAYER_MOVE_STEP,
): WorldPosition {
  const { dx, dy } = DELTA[direction];
  const nextX = Math.max(0, Math.min(position.x + dx * step, mapPixelWidth()));
  const nextY = Math.max(0, Math.min(position.y + dy * step, mapPixelHeight()));

  if (canWalkAt(mapData, nextX, nextY)) {
    return { x: nextX, y: nextY };
  }

  if (canWalkAt(mapData, nextX, position.y)) {
    return { x: nextX, y: position.y };
  }

  if (canWalkAt(mapData, position.x, nextY)) {
    return { x: position.x, y: nextY };
  }

  return position;
}
