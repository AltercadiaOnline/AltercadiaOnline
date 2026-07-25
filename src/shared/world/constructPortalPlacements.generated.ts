/** Auto-gerado por scripts/generate-construct-placements.mjs — NÃO editar.
 * Fonte: public/construct-world/data.json (portais).
 * Regenerar: npm run sync:construct | npm run prepare:construct | npm run generate:construct-placements
 */

import type { ConstructPortalPlacement } from './constructPortalPlacements.js';

export const CONSTRUCT_PORTAL_PLACEMENTS_GENERATED: Readonly<
  Record<'city_portal_north' | 'farm_portal_south', ConstructPortalPlacement>
> = {
  city_portal_north: { mapId: 'city_01', portalId: 'city_portal_north', constructX: 799, constructY: 40, widthPx: 45, heightPx: 40 }, // a
  farm_portal_south: { mapId: 'farm_zone_01', portalId: 'farm_portal_south', constructX: 453, constructY: 2359, widthPx: 45, heightPx: 40 }, // a
};
