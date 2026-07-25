// @ts-nocheck
import { captureBattleLootPreview } from './battleLootBuffer.js';
const packagesByBattleId = new Map();
export const BATTLE_LOOT_PACKAGE_EVENT = 'altercadia:battle-loot-package';
export function captureBattleLootPackage(payload) {
    packagesByBattleId.set(payload.battleId, payload);
    captureBattleLootPreview(payload.lootPreview);
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(BATTLE_LOOT_PACKAGE_EVENT, { detail: payload }));
    }
}
export function peekBattleLootPackage(battleId) {
    return packagesByBattleId.get(battleId) ?? null;
}
export function consumeBattleLootPackage(battleId) {
    const pkg = packagesByBattleId.get(battleId) ?? null;
    packagesByBattleId.delete(battleId);
    return pkg;
}
export function clearBattleLootPackages() {
    packagesByBattleId.clear();
}
const LOOT_PACKAGE_WAIT_MS = 15_000;
/** Aguarda pacote autoritativo (lazy) após vitória. */
export function waitForBattleLootPackage(battleId, timeoutMs = LOOT_PACKAGE_WAIT_MS) {
    const cached = peekBattleLootPackage(battleId);
    if (cached)
        return Promise.resolve(cached);
    if (typeof window === 'undefined') {
        return Promise.resolve(null);
    }
    return new Promise((resolve) => {
        const timer = window.setTimeout(() => {
            cleanup();
            resolve(null);
        }, timeoutMs);
        const onPackage = (event) => {
            const detail = event.detail;
            if (!detail || detail.battleId !== battleId)
                return;
            cleanup();
            resolve(detail);
        };
        const cleanup = () => {
            window.clearTimeout(timer);
            window.removeEventListener(BATTLE_LOOT_PACKAGE_EVENT, onPackage);
        };
        window.addEventListener(BATTLE_LOOT_PACKAGE_EVENT, onPackage);
    });
}
