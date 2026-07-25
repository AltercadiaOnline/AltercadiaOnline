// @ts-nocheck
import { DESIGN_CONFIG } from '../../config/designConstants.js';
import { constructMarkerToLogicalWorld } from './constructNpcPlacements.js';
import { CONSTRUCT_ZONE1_CREATURE_SPAWNS_GENERATED } from './constructCreatureSpawnPlacements.generated.js';
export const CONSTRUCT_SPAWN_MARKER_TO_CREATURE = {
    spawn_rato: 'rat',
    spawn_corvo: 'crow',
    spawn_cachorro: 'wild_dog',
    spawn_morcego: 'bat',
    spawn_aranha: 'spider',
};
/** Spawns Zona 1 — gerados do Construct (única autoridade). */
export const CONSTRUCT_ZONE1_CREATURE_SPAWNS = CONSTRUCT_ZONE1_CREATURE_SPAWNS_GENERATED;
export const CONSTRUCT_CREATURE_SPAWN_MARKER_TYPES = Object.keys(CONSTRUCT_SPAWN_MARKER_TO_CREATURE);
export function resolveConstructSpawnLogical(placement, tileSize = DESIGN_CONFIG.TILE.SIZE) {
    return constructMarkerToLogicalWorld(placement.constructX, placement.constructY, 40, tileSize);
}
