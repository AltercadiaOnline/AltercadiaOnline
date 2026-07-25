// @ts-nocheck
import './bootstrapWorldCollision.js';
export const TILED_MAP_DESCRIPTORS = {};
export function resolveTiledMapDescriptor(_mapId) {
    return null;
}
/** Sempre false — colisão/placements Tiled desligados (Construct). */
export function isTiledMapEnabled(_mapId) {
    return false;
}
export function listTiledMapIds() {
    return [];
}
export function tiledTilesetTextureKey(mapCacheKey, tilesetName) {
    return `${mapCacheKey}:ts:${tilesetName}`;
}
export function tiledObjectTextureKey(mapCacheKey, imagePath) {
    const normalized = imagePath.replace(/\\/g, '/').replace(/^\/+/, '');
    return `${mapCacheKey}:obj:${normalized}`;
}
