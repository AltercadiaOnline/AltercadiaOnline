export type MoveDirection = 'up' | 'down' | 'left' | 'right';

export type MoveIntent = {
  direction: MoveDirection;
};

export type PlayerPositionUpdate = {
  x: number;
  y: number;
};

export const PLAYER_MOVE_STEP = 4;
