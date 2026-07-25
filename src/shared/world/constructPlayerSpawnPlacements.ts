// @ts-nocheck
import { DESIGN_CONFIG } from '../../config/designConstants.js';
import { constructMarkerToLogicalWorld } from './constructNpcPlacements.js';
import { CONSTRUCT_PLAYER_SPAWN_PLACEMENTS_GENERATED } from './constructPlayerSpawnPlacements.generated.js';
export const CONSTRUCT_PLAYER_SPAWN_PLACEMENTS = CONSTRUCT_PLAYER_SPAWN_PLACEMENTS_GENERATED;
export function resolveConstructPlayerSpawn(mapId, tileSize = DESIGN_CONFIG.TILE.SIZE) {
    const placement = CONSTRUCT_PLAYER_SPAWN_PLACEMENTS[mapId];
    if (!placement)
        return null;
    return constructMarkerToLogicalWorld(placement.constructX, placement.constructY, tileSize, tileSize);
}
