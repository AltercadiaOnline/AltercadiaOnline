/** 0: Chão · 1: Escada/Arena · 2: Parede · 3: Cerejeira */
export const TileType = {
  Floor: 0,
  Stairs: 1,
  Wall: 2,
  Obstacle: 3,
} as const;

export type TileId = (typeof TileType)[keyof typeof TileType];

export function isTileBlocking(tile: number): boolean {
  return tile === TileType.Wall || tile === TileType.Obstacle;
}
