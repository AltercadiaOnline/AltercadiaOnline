import { canPlayerStepTo } from './movement.js';
import {
  gridStepBetween,
  tileKey,
  type GridTileCoord,
} from './gridMovement.js';
import { tileCenterToWorldPixel } from './portals.js';

const NEIGHBOR_STEPS: readonly GridTileCoord[] = [
  { tileX: 0, tileY: -1 },
  { tileX: 1, tileY: 0 },
  { tileX: 0, tileY: 1 },
  { tileX: -1, tileY: 0 },
  { tileX: 1, tileY: -1 },
  { tileX: 1, tileY: 1 },
  { tileX: -1, tileY: 1 },
  { tileX: -1, tileY: -1 },
];

function isInMapBounds(mapData: number[][], tileX: number, tileY: number): boolean {
  return tileY >= 0
    && tileY < mapData.length
    && tileX >= 0
    && tileX < (mapData[0]?.length ?? 0);
}

function canWalkBetweenTiles(
  mapData: number[][],
  from: GridTileCoord,
  to: GridTileCoord,
): boolean {
  const step = gridStepBetween(from, to);
  if (!step) return false;
  const fromWorld = tileCenterToWorldPixel(from.tileX, from.tileY);
  const toWorld = tileCenterToWorldPixel(to.tileX, to.tileY);
  return canPlayerStepTo(mapData, fromWorld, toWorld);
}

/**
 * BFS em grade 8-direções com as mesmas regras de colisão do movimento por tecla.
 * Retorna tiles a visitar (exclui origem, inclui destino).
 */
export function findGridPath(
  mapData: number[][],
  start: GridTileCoord,
  goal: GridTileCoord,
  maxVisited = 4096,
): GridTileCoord[] {
  if (tilesEqual(start, goal)) return [];

  const goalKey = tileKey(goal);
  const queue: GridTileCoord[] = [start];
  const visited = new Set<string>([tileKey(start)]);
  const parent = new Map<string, string>();

  let visitedCount = 0;

  while (queue.length > 0) {
    const current = queue.shift()!;
    visitedCount += 1;
    if (visitedCount > maxVisited) break;

    if (tilesEqual(current, goal)) {
      return reconstructPath(parent, goalKey, start);
    }

    for (const offset of NEIGHBOR_STEPS) {
      const next: GridTileCoord = {
        tileX: current.tileX + offset.tileX,
        tileY: current.tileY + offset.tileY,
      };
      if (!isInMapBounds(mapData, next.tileX, next.tileY)) continue;

      const nextKey = tileKey(next);
      if (visited.has(nextKey)) continue;
      if (!canWalkBetweenTiles(mapData, current, next)) continue;

      visited.add(nextKey);
      parent.set(nextKey, tileKey(current));
      queue.push(next);
    }
  }

  return [];
}

function tilesEqual(a: GridTileCoord, b: GridTileCoord): boolean {
  return a.tileX === b.tileX && a.tileY === b.tileY;
}

function reconstructPath(
  parent: Map<string, string>,
  goalKey: string,
  start: GridTileCoord,
): GridTileCoord[] {
  const reversed: GridTileCoord[] = [];
  let cursor: string | undefined = goalKey;

  while (cursor && cursor !== tileKey(start)) {
    const parts = cursor.split(',');
    const tileX = Number(parts[0]);
    const tileY = Number(parts[1]);
    if (!Number.isFinite(tileX) || !Number.isFinite(tileY)) break;
    reversed.push({ tileX, tileY });
    cursor = parent.get(cursor);
  }

  reversed.reverse();
  return reversed;
}
