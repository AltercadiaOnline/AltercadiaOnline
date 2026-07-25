// @ts-nocheck
export const MAP_INSTANCE_SCENE_PREFIX = 'MapInstance:';
export function resolveMapInstanceSceneKey(mapId) {
    return `${MAP_INSTANCE_SCENE_PREFIX}${mapId}`;
}
export function parseMapIdFromInstanceSceneKey(sceneKey) {
    if (!sceneKey.startsWith(MAP_INSTANCE_SCENE_PREFIX))
        return null;
    return sceneKey.slice(MAP_INSTANCE_SCENE_PREFIX.length);
}
export function isMapInstanceSceneKey(sceneKey) {
    return sceneKey.startsWith(MAP_INSTANCE_SCENE_PREFIX);
}
