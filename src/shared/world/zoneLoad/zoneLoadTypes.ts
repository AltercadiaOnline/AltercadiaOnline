// @ts-nocheck
import { CITY_01_ID } from '../maps/city01.js';
import { FARM_ZONE_01_ID } from '../maps/farm_zone_01.js';
/** Zonas de hunt (PvE) — adiadas até city ready ou login já na farm. */
export const HUNT_ZONE_MAP_IDS = [FARM_ZONE_01_ID];
export function isHuntZoneMapId(mapId) {
    return HUNT_ZONE_MAP_IDS.includes(mapId);
}
export function isCityMapId(mapId) {
    return mapId === CITY_01_ID;
}
/** Módulos padrão ao garantir uma zona. */
export function defaultModulesForZone(mapId) {
    if (mapId === FARM_ZONE_01_ID) {
        return ['monsters', 'sprites', 'collision'];
    }
    if (mapId === CITY_01_ID) {
        return ['collision', 'construct-layout'];
    }
    return ['collision'];
}
