import type { GridTileCoord } from './gridMovement.js';
import { tileCenterToWorldPixel } from './portals.js';
import type { WorldPosition } from './movement.js';

export const PATH_WAYPOINT_ARRIVAL_PX = 2;

/** Converte caminho em grade para fila de waypoints em coordenadas float (centro do tile). */
export function gridPathToWorldQueue(
  path: readonly GridTileCoord[],
  playerX: number,
  playerY: number,
  arrivalThresholdPx = PATH_WAYPOINT_ARRIVAL_PX,
): WorldPosition[] {
  const queue = path.map((tile) => tileCenterToWorldPixel(tile.tileX, tile.tileY));

  while (queue.length > 0) {
    const head = queue[0]!;
    if (Math.hypot(head.x - playerX, head.y - playerY) <= arrivalThresholdPx) {
      queue.shift();
    } else {
      break;
    }
  }

  return queue;
}
