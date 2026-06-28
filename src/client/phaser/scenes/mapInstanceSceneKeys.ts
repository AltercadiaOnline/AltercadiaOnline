import type { MapId } from '../../../shared/world/mapRegistry.js';

export const MAP_INSTANCE_SCENE_PREFIX = 'MapInstance:';

export function resolveMapInstanceSceneKey(mapId: MapId | string): string {
  return `${MAP_INSTANCE_SCENE_PREFIX}${mapId}`;
}

export function parseMapIdFromInstanceSceneKey(sceneKey: string): MapId | null {
  if (!sceneKey.startsWith(MAP_INSTANCE_SCENE_PREFIX)) return null;
  return sceneKey.slice(MAP_INSTANCE_SCENE_PREFIX.length) as MapId;
}

export function isMapInstanceSceneKey(sceneKey: string): boolean {
  return sceneKey.startsWith(MAP_INSTANCE_SCENE_PREFIX);
}
