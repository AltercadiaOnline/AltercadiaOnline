import { DESIGN_CONFIG } from '../../config/designConstants.js';
import type { MapId } from './mapRegistry.js';
import { constructMarkerToLogicalWorld } from './constructNpcPlacements.js';
import { CONSTRUCT_ZONE1_CREATURE_SPAWNS_GENERATED } from './constructCreatureSpawnPlacements.generated.js';

/** IDs de gameplay das criaturas Zona 1 (espelha ZONE1_ALLEY_CREATURES). */
export type ConstructZone1CreatureId = 'rat' | 'crow' | 'wild_dog' | 'bat' | 'spider';

export const CONSTRUCT_SPAWN_MARKER_TO_CREATURE: Readonly<
  Record<string, ConstructZone1CreatureId>
> = {
  spawn_rato: 'rat',
  spawn_corvo: 'crow',
  spawn_cachorro: 'wild_dog',
  spawn_morcego: 'bat',
  spawn_aranha: 'spider',
};

export type ConstructCreatureSpawnPlacement = {
  readonly mapId: MapId;
  readonly markerType: string;
  readonly creatureId: ConstructZone1CreatureId;
  readonly constructX: number;
  readonly constructY: number;
  readonly index: number;
};

/** Spawns Zona 1 — gerados do Construct (única autoridade). */
export const CONSTRUCT_ZONE1_CREATURE_SPAWNS: readonly ConstructCreatureSpawnPlacement[] =
  CONSTRUCT_ZONE1_CREATURE_SPAWNS_GENERATED;

export const CONSTRUCT_CREATURE_SPAWN_MARKER_TYPES = Object.keys(
  CONSTRUCT_SPAWN_MARKER_TO_CREATURE,
) as readonly string[];

export function resolveConstructSpawnLogical(
  placement: ConstructCreatureSpawnPlacement,
  tileSize: number = DESIGN_CONFIG.TILE.SIZE,
): { readonly worldX: number; readonly worldY: number; readonly tileX: number; readonly tileY: number } {
  return constructMarkerToLogicalWorld(
    placement.constructX,
    placement.constructY,
    40,
    tileSize,
  );
}
