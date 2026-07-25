// @ts-nocheck
import { buildWorldGroundDropId, WORLD_GROUND_DROP_TTL_MS, } from '../../shared/world/worldGroundDrop.js';
const dropsById = new Map();
const dropIdsByMap = new Map();
export function registerWorldGroundDrop(input) {
    const nowMs = input.nowMs ?? Date.now();
    const drop = {
        dropId: buildWorldGroundDropId(nowMs),
        mapId: input.mapId.trim(),
        position: { x: input.position.x, y: input.position.y },
        itemId: input.itemId.trim(),
        quantity: Math.max(1, Math.floor(input.quantity)),
        droppedByPlayerId: input.droppedByPlayerId,
        droppedAtMs: nowMs,
        expiresAtMs: nowMs + WORLD_GROUND_DROP_TTL_MS,
    };
    dropsById.set(drop.dropId, drop);
    const mapSet = dropIdsByMap.get(drop.mapId) ?? new Set();
    mapSet.add(drop.dropId);
    dropIdsByMap.set(drop.mapId, mapSet);
    return drop;
}
export function getWorldGroundDrop(dropId) {
    return dropsById.get(dropId.trim()) ?? null;
}
export function listWorldGroundDropsOnMap(mapId) {
    const ids = dropIdsByMap.get(mapId.trim());
    if (!ids)
        return [];
    return [...ids]
        .map((id) => dropsById.get(id))
        .filter((row) => row !== undefined);
}
export function removeWorldGroundDrop(dropId) {
    const existing = dropsById.get(dropId.trim());
    if (!existing)
        return null;
    dropsById.delete(existing.dropId);
    const mapSet = dropIdsByMap.get(existing.mapId);
    mapSet?.delete(existing.dropId);
    if (mapSet && mapSet.size === 0) {
        dropIdsByMap.delete(existing.mapId);
    }
    return existing;
}
export function sweepExpiredWorldGroundDrops(nowMs = Date.now()) {
    let removed = 0;
    for (const drop of dropsById.values()) {
        if (drop.expiresAtMs > nowMs)
            continue;
        if (removeWorldGroundDrop(drop.dropId))
            removed += 1;
    }
    return removed;
}
export function resetWorldGroundDropRegistryForTests() {
    dropsById.clear();
    dropIdsByMap.clear();
}
