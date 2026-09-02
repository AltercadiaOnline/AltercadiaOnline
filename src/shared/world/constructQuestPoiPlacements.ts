import { DESIGN_CONFIG } from '../../config/designConstants.js';
import type { MapId } from './mapRegistry.js';
import { constructMarkerToLogicalWorld } from './constructNpcPlacements.js';
import { CONSTRUCT_QUEST_POI_PLACEMENTS_GENERATED } from './constructQuestPoiPlacements.generated.js';
import questPoiConstructMarkers from '../../config/questPoiConstructMarkers.json' with { type: 'json' };

export type ConstructQuestPoiPlacement = {
  readonly poiId: string;
  readonly mapId: MapId;
  readonly constructLayout?: string;
  readonly constructX: number;
  readonly constructY: number;
};

export const CONSTRUCT_QUEST_POI_MARKER_TYPES = [
  ...Object.keys(questPoiConstructMarkers),
] as const;

export const CONSTRUCT_QUEST_POI_PLACEMENTS: readonly ConstructQuestPoiPlacement[] =
  CONSTRUCT_QUEST_POI_PLACEMENTS_GENERATED;

export function hasConstructQuestPoiPlacement(poiId: string, mapId?: MapId): boolean {
  return CONSTRUCT_QUEST_POI_PLACEMENTS.some(
    (entry) => entry.poiId === poiId && (mapId === undefined || entry.mapId === mapId),
  );
}

export function getConstructQuestPoiPlacement(poiId: string): ConstructQuestPoiPlacement | null {
  return CONSTRUCT_QUEST_POI_PLACEMENTS.find((entry) => entry.poiId === poiId) ?? null;
}

export function listConstructQuestPoiPlacementsForMap(mapId: MapId): readonly ConstructQuestPoiPlacement[] {
  return CONSTRUCT_QUEST_POI_PLACEMENTS.filter((entry) => entry.mapId === mapId);
}

/** Centro Construct → tile de interação (mesma regra dos NPCs). */
export function resolveQuestPoiWorldTile(placement: ConstructQuestPoiPlacement): {
  readonly tileX: number;
  readonly tileY: number;
} {
  const logical = constructMarkerToLogicalWorld(
    placement.constructX,
    placement.constructY,
    DESIGN_CONFIG.TILE.SIZE,
  );
  return { tileX: logical.tileX, tileY: logical.tileY };
}
