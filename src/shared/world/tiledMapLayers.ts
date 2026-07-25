// @ts-nocheck
/** Convenção de nomes de camadas Tiled — normalizar com lowercase + trim. */
export function normalizeTiledLayerName(layerName) {
    return layerName.trim().toLowerCase().replace(/\s+/g, '_');
}
/** Tile layer invisível — colisão de tiles (`collides: true` no tileset). */
export function isTiledCollisionTileLayer(layerName) {
    const normalized = normalizeTiledLayerName(layerName);
    return normalized === 'collision' || normalized === 'collisionlayer';
}
/** Tile layers visuais — chão e decoração (qualquer tile layer exceto colisão). */
export function isTiledVisualTileLayer(layerName) {
    return !isTiledCollisionTileLayer(layerName);
}
/** Object layer — estruturas estáticas (/structures). */
export function isTiledStructureObjectLayer(layerName) {
    return normalizeTiledLayerName(layerName) === 'structures';
}
/** Object layer — props decorativos (/props). */
export function isTiledPropObjectLayer(layerName) {
    return normalizeTiledLayerName(layerName) === 'props';
}
/** Object layer — spawns (sem sprite; só metadados). Aceita alias `spawn` do Tiled. */
export function isTiledSpawnObjectLayer(layerName) {
    const normalized = normalizeTiledLayerName(layerName);
    return normalized === 'spawns' || normalized === 'spawn';
}
/** Object layer — posições de NPC (pontos; sem sprite no MapLoader). */
export function isTiledNpcObjectLayer(layerName) {
    return normalizeTiledLayerName(layerName) === 'npcs';
}
/** Object layer reservada a metadados de colisão (sem sprites). */
export function isTiledCollisionObjectLayer(layerName) {
    const normalized = normalizeTiledLayerName(layerName);
    return normalized === 'collision'
        || normalized === 'collisionlayer'
        || normalized === 'collisions'
        || normalized === 'colisao'
        || normalized === 'colisoes';
}
/**
 * Object layers instanciadas como sprites pelo MapLoader.
 * Aceita nomes livres do Tiled (ex.: objetos1-128x128, pulpito) — não só structures/props.
 */
export function isTiledRenderableObjectLayer(layerName) {
    if (isTiledSpawnObjectLayer(layerName))
        return false;
    if (isTiledNpcObjectLayer(layerName))
        return false;
    if (isTiledCollisionObjectLayer(layerName))
        return false;
    return true;
}
