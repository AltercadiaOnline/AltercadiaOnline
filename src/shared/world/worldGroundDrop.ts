// @ts-nocheck
/** Tempo até o drop sumir do mundo (ms). */
export const WORLD_GROUND_DROP_TTL_MS = 5 * 60 * 1000;
/** Raio máximo para coletar um drop (px mundo). */
export const WORLD_GROUND_PICKUP_RADIUS_PX = 56;
export function buildWorldGroundDropId(nowMs = Date.now()) {
    return `drop_${nowMs.toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
export function distanceSquaredBetween(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return dx * dx + dy * dy;
}
export function isWithinGroundPickupRadius(playerPosition, dropPosition, radiusPx = WORLD_GROUND_PICKUP_RADIUS_PX) {
    return distanceSquaredBetween(playerPosition, dropPosition) <= radiusPx * radiusPx;
}
