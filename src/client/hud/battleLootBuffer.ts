// @ts-nocheck
let pendingBattleLoot = null;
/** Reserva preview de loot (fallback mock / compat). */
export function captureBattleLootPreview(preview) {
    pendingBattleLoot = preview;
}
/** @deprecated Use captureBattleLootPreview */
export function captureBattleLoot(payload) {
    if (!payload.lootId)
        return;
    pendingBattleLoot = {
        lootId: payload.lootId,
        sourceId: payload.creatureId ?? 'unknown',
        voltReward: payload.dollarVolt,
        items: payload.itemIds.map((itemId) => ({
            itemId,
            quantity: 1,
            rarity: 'common',
        })),
    };
}
export function peekPendingBattleLoot() {
    return pendingBattleLoot;
}
export function consumePendingBattleLoot() {
    const loot = pendingBattleLoot;
    pendingBattleLoot = null;
    return loot;
}
export function clearPendingBattleLoot() {
    pendingBattleLoot = null;
}
