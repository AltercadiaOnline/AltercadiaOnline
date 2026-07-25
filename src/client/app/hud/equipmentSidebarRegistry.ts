// @ts-nocheck
export function registerEquipmentSidebarHud(api) {
    globalThis.__ALTERCADIA_EQUIPMENT_SIDEBAR_HUD__ = api;
}
export function getEquipmentSidebarHud() {
    return globalThis.__ALTERCADIA_EQUIPMENT_SIDEBAR_HUD__ ?? null;
}
export function clearEquipmentSidebarHud() {
    delete globalThis.__ALTERCADIA_EQUIPMENT_SIDEBAR_HUD__;
}
