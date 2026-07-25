// @ts-nocheck
/** Mapas Tiled que voltaram ao canvas legado — exibir layout procedural até Phaser montar. */
const proceduralFallbackMapIds = new Set();
const listeners = new Set();
export function isPhaserCanvasProceduralFallback(mapId) {
    return proceduralFallbackMapIds.has(mapId);
}
export function markPhaserCanvasProceduralFallback(mapId, options) {
    const alreadyMarked = proceduralFallbackMapIds.has(mapId);
    proceduralFallbackMapIds.add(mapId);
    if (!alreadyMarked || options?.force) {
        for (const listener of listeners) {
            listener(mapId);
        }
    }
}
export function clearPhaserCanvasProceduralFallback(mapId) {
    if (mapId) {
        proceduralFallbackMapIds.delete(mapId);
        return;
    }
    proceduralFallbackMapIds.clear();
}
export function subscribePhaserCanvasProceduralFallback(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}
