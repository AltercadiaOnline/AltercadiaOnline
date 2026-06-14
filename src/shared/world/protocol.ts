import type { PlayerFacing } from './playerFacing.js';

export type MoveDirection = 'up' | 'down' | 'left' | 'right';

/** Um passo discreto na grade (1 SQM por intenção). */
export type MoveIntent = {
  readonly stepX: -1 | 0 | 1;
  readonly stepY: -1 | 0 | 1;
};

/** Pivot Tibia — gira o sprite sem deslocar x/y. */
export type RotateIntent = {
  direction: MoveDirection;
};
export type PlayerPositionUpdate = {
  x: number;
  y: number;
  facing?: PlayerFacing;
  mapId?: string;
};

export type MapTransitionPayload = {
  readonly mapId: string;
  readonly x: number;
  readonly y: number;
  readonly facing?: PlayerFacing;
  readonly portalLabel?: string;
};

export type PortalEnterIntent = {
  readonly portalId: string;
};

export type PortalAccessDeniedPayload = {
  readonly portalId: string;
  readonly reason: string;
};

/** @deprecated Use moveByDirectionDelta + PLAYER_MOVE_SPEED_PX_PER_SEC. */
export const PLAYER_MOVE_STEP = 8;