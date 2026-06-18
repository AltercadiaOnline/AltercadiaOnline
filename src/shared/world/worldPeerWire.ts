import type { PlayerFacing } from './playerFacing.js';
import { PLAYER_FACING_ORDER } from './playerFacing.js';

/**
 * Formato compacto de peers — chaves curtas para reduzir banda no WebSocket.
 * Cada peer: [characterId, tileX, tileY, facingCode]
 */
export type CompactPeerTuple = readonly [number, number, number, number];

export type WorldPeersCompactPayload = {
  /** tick do servidor */
  readonly t: number;
  /** mapId */
  readonly m: string;
  /** peers visíveis (sem o próprio jogador) */
  readonly p: readonly CompactPeerTuple[];
};

const FACING_TO_CODE = new Map<PlayerFacing, number>(
  PLAYER_FACING_ORDER.map((facing, index) => [facing, index]),
);

const CODE_TO_FACING: readonly PlayerFacing[] = PLAYER_FACING_ORDER;

export function facingToWireCode(facing: PlayerFacing): number {
  return FACING_TO_CODE.get(facing) ?? 0;
}

export function wireCodeToFacing(code: number): PlayerFacing {
  return CODE_TO_FACING[code] ?? 'south';
}

export function encodePeerTuple(
  characterId: number,
  tileX: number,
  tileY: number,
  facing: PlayerFacing,
): CompactPeerTuple {
  return [characterId, tileX, tileY, facingToWireCode(facing)];
}

export function isWorldPeersCompactPayload(value: unknown): value is WorldPeersCompactPayload {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  if (typeof record.t !== 'number' || typeof record.m !== 'string') return false;
  if (!Array.isArray(record.p)) return false;
  return record.p.every((entry) =>
    Array.isArray(entry)
    && entry.length === 4
    && entry.every((part) => typeof part === 'number' && Number.isFinite(part)),
  );
}
