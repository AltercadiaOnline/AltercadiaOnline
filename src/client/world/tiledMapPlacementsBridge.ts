// @ts-nocheck
const listeners = new Set();
/** MapLoader confirmou placements após montar o mapa Phaser. */
export function notifyTiledMapPlacementsCommitted(mapId) {
    for (const listener of listeners) {
        listener(mapId);
    }
}
export function subscribeTiledMapPlacementsCommitted(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}
