import { DESIGN_CONFIG } from '../../config/designConstants.js';
import type { MapId } from './mapRegistry.js';
import { constructMarkerToLogicalWorld } from './constructNpcPlacements.js';
import { CONSTRUCT_PLAYER_SPAWN_PLACEMENTS_GENERATED } from './constructPlayerSpawnPlacements.generated.js';

/**
 * Marker Construct `spawn_players` — spawn seguro / perfil default.
 * Dados: constructPlayerSpawnPlacements.generated.ts
 */
export type ConstructPlayerSpawnPlacement = {
  readonly mapId: MapId;
  readonly constructX: number;
  readonly constructY: number;
  readonly widthPx: number;
  readonly heightPx: number;
};

export const CONSTRUCT_PLAYER_SPAWN_PLACEMENTS: Readonly<
  Partial<Record<MapId, ConstructPlayerSpawnPlacement>>
> = CONSTRUCT_PLAYER_SPAWN_PLACEMENTS_GENERATED;

export function resolveConstructPlayerSpawn(
  mapId: MapId,
  tileSize: number = DESIGN_CONFIG.TILE.SIZE,
): { readonly worldX: number; readonly worldY: number; readonly tileX: number; readonly tileY: number } | null {
  const placement = CONSTRUCT_PLAYER_SPAWN_PLACEMENTS[mapId];
  if (!placement) return null;
  return constructMarkerToLogicalWorld(
    placement.constructX,
    placement.constructY,
    tileSize,
    tileSize,
  );
}
