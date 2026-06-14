import type { MoveDirection } from './protocol.js';
import type { PlayerFacing } from './playerFacing.js';

/** Intenção de movimento — cliente envia tile alvo adjacente (1 SQM). */
export type MovePlayerIntentPayload = {
  readonly targetX: number;
  readonly targetY: number;
  readonly seq: number;
};

/** Pivot no próprio eixo — altera facing sem deslocar posição. */
export type RotatePlayerIntentPayload = {
  readonly direction: MoveDirection;
  readonly seq: number;
};

export type AuthoritativePositionDelta = {
  readonly mapId: string;
  readonly x: number;
  readonly y: number;
  readonly facing: PlayerFacing;
  readonly moveSeq?: number;
};

export function isMovePlayerIntentPayload(value: unknown): value is MovePlayerIntentPayload {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.targetX === 'number'
    && Number.isFinite(record.targetX)
    && typeof record.targetY === 'number'
    && Number.isFinite(record.targetY)
    && typeof record.seq === 'number'
    && Number.isFinite(record.seq)
    && record.seq > 0
  );
}

const ROTATE_DIRECTIONS = new Set<MoveDirection>(['up', 'down', 'left', 'right']);

export function isRotatePlayerIntentPayload(value: unknown): value is RotatePlayerIntentPayload {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.direction === 'string'
    && ROTATE_DIRECTIONS.has(record.direction as MoveDirection)
    && typeof record.seq === 'number'
    && Number.isFinite(record.seq)
    && record.seq > 0
  );
}
