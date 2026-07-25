// @ts-nocheck
export function readTiledObjectProperty(object, propertyName) {
    const entry = object.properties?.find((property) => property.name === propertyName);
    return entry?.value;
}
/**
 * UID estável para sync servidor — prioriza propriedade `uid` do Tiled.
 * Formato canônico: `{mapId}:{uid|layer:id}`.
 */
export function resolveTiledMapObjectUid(mapId, layerName, object) {
    const customUid = readTiledObjectProperty(object, 'uid');
    if (typeof customUid === 'string' && customUid.trim().length > 0) {
        return `${mapId}:${customUid.trim()}`;
    }
    if (typeof customUid === 'number' && Number.isFinite(customUid)) {
        return `${mapId}:${customUid}`;
    }
    if (object.id !== undefined) {
        return `${mapId}:${layerName}:${object.id}`;
    }
    const fallbackName = object.name?.trim() || 'object';
    return `${mapId}:${layerName}:${fallbackName}`;
}
/** Colisão de props/estruturas — propriedade Tiled `collidable: true`. */
export function isTiledMapObjectCollidable(object) {
    const value = readTiledObjectProperty(object, 'collidable');
    return value === true || value === 'true' || value === 1;
}
