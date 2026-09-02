import { DESIGN_CONFIG } from '../../config/designConstants.js';
import { isConstructFarmLayoutActive } from './constructFarmLayouts.js';
import type { MapId } from './mapRegistry.js';
import { constructMarkerToLogicalWorld } from './constructNpcPlacements.js';
import { CONSTRUCT_ZONE1_CREATURE_SPAWNS_GENERATED } from './constructCreatureSpawnPlacements.generated.js';

/** IDs de gameplay das criaturas Zona 1 (espelha ZONE1_ALLEY_CREATURES). */
export type ConstructZone1CreatureId = 'rat' | 'crow' | 'wild_dog' | 'bat' | 'spider' | 'vortex_agent';

export const CONSTRUCT_SPAWN_MARKER_TO_CREATURE: Readonly<
  Record<string, ConstructZone1CreatureId>
> = {
  spawn_rato: 'rat',
  spawn_corvo: 'crow',
  spawn_cachorro: 'wild_dog',
  spawn_morcego: 'bat',
  spawn_aranha: 'spider',
  spawn_agente_vortex: 'vortex_agent',
};

export type ConstructCreatureSpawnPlacement = {
  readonly mapId: MapId;
  readonly constructLayout: string;
  readonly markerType: string;
  readonly creatureId: ConstructZone1CreatureId;
  readonly constructX: number;
  readonly constructY: number;
  readonly index: number;
};

function listActiveConstructCreatureSpawns(): readonly ConstructCreatureSpawnPlacement[] {
  return CONSTRUCT_ZONE1_CREATURE_SPAWNS_GENERATED.filter((spawn) =>
    isConstructFarmLayoutActive(spawn.constructLayout),
  );
}

/** Spawns Zona 1 ativos no layout principal — gerados do Construct. */
export const CONSTRUCT_ZONE1_CREATURE_SPAWNS: readonly ConstructCreatureSpawnPlacement[] =
  listActiveConstructCreatureSpawns();

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
