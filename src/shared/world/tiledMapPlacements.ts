// @ts-nocheck
const placementsByMapId = new Map();
export function setTiledMapPlacements(mapId, placements) {
    placementsByMapId.set(mapId, placements);
}
export function getTiledMapPlacements(mapId) {
    return placementsByMapId.get(mapId) ?? null;
}
export function getTiledNpcPlacement(mapId, npcId) {
    return placementsByMapId.get(mapId)?.npcs.get(npcId) ?? null;
}
export function getTiledMapPlayerSpawn(mapId) {
    return placementsByMapId.get(mapId)?.playerSpawn ?? null;
}
export function hasTiledNpcPlacements(mapId) {
    const npcs = placementsByMapId.get(mapId)?.npcs;
    return Boolean(npcs && npcs.size > 0);
}
export function clearTiledMapPlacements(mapId) {
    if (mapId) {
        placementsByMapId.delete(mapId);
        return;
    }
    placementsByMapId.clear();
}
