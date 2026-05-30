export const TILE_SIZE = 32;
export const MAP_TILES = 40;

/** 0: Chão · 1: Escada/Arena · 2: Parede · 3: Cerejeira */
export const TileType = {
  Floor: 0,
  Stairs: 1,
  Wall: 2,
  Obstacle: 3,
} as const;

export type TileId = (typeof TileType)[keyof typeof TileType];

const ARENA_MIN = 12;
const ARENA_MAX = 28;

const CHERRY_TREE_CORNERS: ReadonlyArray<readonly [number, number]> = [
  [ARENA_MIN, ARENA_MIN],
  [ARENA_MIN, ARENA_MAX],
  [ARENA_MAX, ARENA_MIN],
  [ARENA_MAX, ARENA_MAX],
];

function paintBorderWalls(mapData: number[][]): void {
  for (let x = 0; x < MAP_TILES; x++) {
    mapData[0]![x] = TileType.Wall;
    mapData[MAP_TILES - 1]![x] = TileType.Wall;
  }

  for (let y = 0; y < MAP_TILES; y++) {
    mapData[y]![0] = TileType.Wall;
    mapData[y]![MAP_TILES - 1] = TileType.Wall;
  }
}

function paintCentralArena(mapData: number[][]): void {
  for (let y = ARENA_MIN; y <= ARENA_MAX; y++) {
    for (let x = ARENA_MIN; x <= ARENA_MAX; x++) {
      mapData[y]![x] = TileType.Stairs;
    }
  }
}

function paintCherryTrees(mapData: number[][]): void {
  for (const [x, y] of CHERRY_TREE_CORNERS) {
    mapData[y]![x] = TileType.Obstacle;
  }
}

/** Matriz 40×40 da cidade: chão, moldura, arena central e cerejeiras nos cantos da praça. */
export function generateMapData(): number[][] {
  const mapData: number[][] = Array.from({ length: MAP_TILES }, () =>
    Array<number>(MAP_TILES).fill(TileType.Floor),
  );

  paintBorderWalls(mapData);
  paintCentralArena(mapData);
  paintCherryTrees(mapData);

  return mapData;
}

export function isTileBlocking(tile: number): boolean {
  return tile === TileType.Wall || tile === TileType.Obstacle;
}

export function tileAt(mapData: number[][], worldX: number, worldY: number): number {
  const col = Math.floor(worldX / TILE_SIZE);
  const row = Math.floor(worldY / TILE_SIZE);

  if (col < 0 || row < 0 || col >= MAP_TILES || row >= MAP_TILES) {
    return TileType.Wall;
  }

  return mapData[row]?.[col] ?? TileType.Wall;
}

export function canWalkAt(mapData: number[][], worldX: number, worldY: number): boolean {
  return !isTileBlocking(tileAt(mapData, worldX, worldY));
}

export function mapPixelWidth(): number {
  return MAP_TILES * TILE_SIZE;
}

export function mapPixelHeight(): number {
  return MAP_TILES * TILE_SIZE;
}
