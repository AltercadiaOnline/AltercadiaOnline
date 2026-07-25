// @ts-nocheck
import { CITY_01_ID } from '../../../shared/world/maps/city01.js';
import { FARM_ZONE_01_ID } from '../../../shared/world/maps/farm_zone_01.js';
/**
 * Overview estático por mapId — espelho Construct (cidade_01 / zonabeco1).
 * Gerado por `node scripts/generate-minimap-overviews.mjs`.
 */
export const MINIMAP_OVERVIEW_URL_BY_MAP_ID = {
    [CITY_01_ID]: '/assets/minimaps/city_01.webp',
    [FARM_ZONE_01_ID]: '/assets/minimaps/farm_zone_01.webp',
};
export function resolveMinimapOverviewUrl(mapId) {
    return MINIMAP_OVERVIEW_URL_BY_MAP_ID[mapId] ?? null;
}
