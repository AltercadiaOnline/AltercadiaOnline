import type { MoveDirection } from './protocol.js';

/** Pivot e sprites de pet/NPC/criatura — só N/S/L/O. */
export type CardinalFacing = 'north' | 'south' | 'east' | 'west';

export type DiagonalFacing =
  | 'north-east'
  | 'north-west'
  | 'south-east'
  | 'south-west';

/** Facing do operativo — 8 vias (andar/clique). Pivot CTRL só grava cardinais. */
export type PlayerFacing = CardinalFacing | DiagonalFacing;

export const CARDINAL_FACING_ORDER: readonly CardinalFacing[] = [
  'south',
  'north',
  'east',
  'west',
] as const;

/**
 * Wire compacto: índices 0–3 = cardinais legado; 4–7 = diagonais.
 * Não reordenar o prefixo — quebra `world-peers`.
 */
export const PLAYER_FACING_ORDER: readonly PlayerFacing[] = [
  ...CARDINAL_FACING_ORDER,
  'south-east',
  'north-east',
  'north-west',
  'south-west',
] as const;

const PLAYER_FACING_SET = new Set<string>(PLAYER_FACING_ORDER);

/** Chaves de rotação no spritesheet (8 direções). */
export type SpriteDirectionKey = PlayerFacing;

export function isCardinalFacing(value: string): value is CardinalFacing {
  return value === 'north' || value === 'south' || value === 'east' || value === 'west';
}

export function isPlayerFacing(value: unknown): value is PlayerFacing {
  return typeof value === 'string' && PLAYER_FACING_SET.has(value);
}

export function parsePlayerFacing(value: unknown, fallback: PlayerFacing = 'south'): PlayerFacing {
  return isPlayerFacing(value) ? value : fallback;
}

/** Pet / NPC / criatura — sheet 4 vias. */
export function toCardinalFacing(facing: PlayerFacing): CardinalFacing {
  if (isCardinalFacing(facing)) return facing;
  if (facing.startsWith('north')) return 'north';
  if (facing.startsWith('south')) return 'south';
  if (facing.endsWith('east')) return 'east';
  return 'west';
}

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

const FACING_BY_OCTANT: readonly PlayerFacing[] = [
  'east',
  'south-east',
  'south',
  'south-west',
  'west',
  'north-west',
  'north',
  'north-east',
];

/** Facing 8-way a partir de vetor (eixo +Y = sul). */
export function moveVectorToFacing(dx: number, dy: number): PlayerFacing {
  if (Math.abs(dx) < 1e-6 && Math.abs(dy) < 1e-6) return 'south';
  const octant = Math.round(Math.atan2(dy, dx) / (Math.PI / 4));
  const index = ((octant % 8) + 8) % 8;
  return FACING_BY_OCTANT[index] ?? 'south';
}

export function moveVectorToSpriteDirection(dx: number, dy: number): SpriteDirectionKey {
  return moveVectorToFacing(dx, dy);
}

export function facingToSpriteDirection(facing: PlayerFacing): SpriteDirectionKey {
  return facing;
}
