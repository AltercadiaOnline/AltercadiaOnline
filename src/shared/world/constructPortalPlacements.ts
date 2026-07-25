// @ts-nocheck
import { DESIGN_CONFIG } from '../../config/designConstants.js';
import { CONSTRUCT_PORTAL_PLACEMENTS_GENERATED } from './constructPortalPlacements.generated.js';
export const CONSTRUCT_PORTAL_PLACEMENTS = CONSTRUCT_PORTAL_PLACEMENTS_GENERATED;
export function constructPortalToTriggerTiles(placement, tileSize = DESIGN_CONFIG.TILE.SIZE) {
    const centerTileX = Math.floor(placement.constructX / tileSize);
    const centerTileY = Math.floor(placement.constructY / tileSize);
    const tileW = Math.max(1, Math.ceil(placement.widthPx / tileSize));
    const tileH = Math.max(1, Math.ceil(placement.heightPx / tileSize));
    return {
        tileX: centerTileX - Math.floor(tileW / 2),
        tileY: Math.max(0, centerTileY - Math.floor(tileH / 2)),
        tileW,
        tileH,
    };
}
export function constructPortalArrivalTile(placement, offsetTiles, tileSize = DESIGN_CONFIG.TILE.SIZE) {
    return {
        x: Math.floor(placement.constructX / tileSize) + offsetTiles.dx,
        y: Math.floor(placement.constructY / tileSize) + offsetTiles.dy,
    };
}
