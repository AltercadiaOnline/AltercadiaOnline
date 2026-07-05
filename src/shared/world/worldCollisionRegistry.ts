import type { MapId } from './mapRegistry.js';
import type { WorldCollisionObstacle } from './worldCollisionObstacle.js';

const obstaclesByMapId = new Map<MapId, readonly WorldCollisionObstacle[]>();
let activeMapId: MapId | null = null;

export function setWorldCollisionObstacles(
  mapId: MapId,
  obstacles: readonly WorldCollisionObstacle[],
): void {
  obstaclesByMapId.set(mapId, obstacles);
}

export function getWorldCollisionObstacles(mapId: MapId): readonly WorldCollisionObstacle[] {
  return obstaclesByMapId.get(mapId) ?? [];
}

export function setActiveWorldCollisionMapId(mapId: MapId | null): void {
  activeMapId = mapId;
}

export function getActiveWorldCollisionMapId(): MapId | null {
  return activeMapId;
}

export function getActiveWorldCollisionObstacles(): readonly WorldCollisionObstacle[] {
  if (!activeMapId) return [];
  return getWorldCollisionObstacles(activeMapId);
}

export function clearWorldCollisionObstacles(mapId?: MapId): void {
  if (mapId) {
    obstaclesByMapId.delete(mapId);
    if (activeMapId === mapId) activeMapId = null;
    return;
  }
  obstaclesByMapId.clear();
  activeMapId = null;
}
