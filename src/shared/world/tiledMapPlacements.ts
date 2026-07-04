import type { MapId } from './mapRegistry.js';
import type { TiledPlayerSpawn } from './tiledMapSpawn.js';

export type TiledNpcPlacement = {
  readonly npcId: string;
  readonly worldX: number;
  readonly worldY: number;
  readonly tileX: number;
  readonly tileY: number;
  readonly collidable: boolean;
};

export type TiledMapPlacements = {
  readonly playerSpawn: TiledPlayerSpawn | null;
  readonly npcs: ReadonlyMap<string, TiledNpcPlacement>;
};

const placementsByMapId = new Map<MapId, TiledMapPlacements>();

export function setTiledMapPlacements(mapId: MapId, placements: TiledMapPlacements): void {
  placementsByMapId.set(mapId, placements);
}

export function getTiledMapPlacements(mapId: MapId): TiledMapPlacements | null {
  return placementsByMapId.get(mapId) ?? null;
}

export function getTiledNpcPlacement(mapId: MapId, npcId: string): TiledNpcPlacement | null {
  return placementsByMapId.get(mapId)?.npcs.get(npcId) ?? null;
}

export function getTiledMapPlayerSpawn(mapId: MapId): TiledPlayerSpawn | null {
  return placementsByMapId.get(mapId)?.playerSpawn ?? null;
}

export function hasTiledNpcPlacements(mapId: MapId): boolean {
  const npcs = placementsByMapId.get(mapId)?.npcs;
  return Boolean(npcs && npcs.size > 0);
}

export function clearTiledMapPlacements(mapId?: MapId): void {
  if (mapId) {
    placementsByMapId.delete(mapId);
    return;
  }
  placementsByMapId.clear();
}
