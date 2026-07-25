// @ts-nocheck
import { DESIGN_CONFIG } from '../../config/designConstants.js';
import { FARM_ZONE_01_PORTALS, FARM_ZONE_01_TILES_HIGH, FARM_ZONE_01_TILES_WIDE, } from '../../shared/world/maps/farm_zone_01.js';
import { portalCenterTile } from '../../shared/world/portals.js';
import { VisualTileKind } from './city01VisualLayout.js';
export function buildFarmZone01VisualLayout() {
    const landmarkById = new Map();
    const tiles = [];
    for (const portal of FARM_ZONE_01_PORTALS) {
        const center = portalCenterTile(portal);
        landmarkById.set(portal.id, {
            id: portal.id,
            label: portal.label,
            kind: 'portal',
            tileX: center.x,
            tileY: center.y,
        });
    }
    for (let y = 0; y < FARM_ZONE_01_TILES_HIGH; y++) {
        const row = [];
        for (let x = 0; x < FARM_ZONE_01_TILES_WIDE; x++) {
            row.push({ kind: VisualTileKind.Road, landmarkId: null });
        }
        tiles.push(row);
    }
    return {
        tiles,
        landmarks: [...landmarkById.values()],
        mapTilesWide: FARM_ZONE_01_TILES_WIDE,
        mapTilesHigh: FARM_ZONE_01_TILES_HIGH,
        tileSize: DESIGN_CONFIG.TILE.SIZE,
    };
}
