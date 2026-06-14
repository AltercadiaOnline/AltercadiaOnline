import { CITY_01_ID } from './maps/city01.js';
import { CITY_01_ARENA_RANKING_MONITOR } from './maps/city01LayoutConstants.js';
import type { MapId } from './mapRegistry.js';

export const WorldObjectAction = {
  OPEN_RANKING_MONITOR: 'OPEN_RANKING_MONITOR',
} as const;

export type WorldObjectAction = (typeof WorldObjectAction)[keyof typeof WorldObjectAction];

export type WorldObjectDefinition = {
  readonly id: string;
  readonly label: string;
  readonly mapId: MapId;
  readonly tileX: number;
  readonly tileY: number;
  readonly tileW: number;
  readonly tileH: number;
  readonly action: WorldObjectAction;
};

export const WORLD_OBJECT_REGISTRY: readonly WorldObjectDefinition[] = [
  {
    id: CITY_01_ARENA_RANKING_MONITOR.id,
    label: CITY_01_ARENA_RANKING_MONITOR.label,
    mapId: CITY_01_ID,
    tileX: CITY_01_ARENA_RANKING_MONITOR.tileX,
    tileY: CITY_01_ARENA_RANKING_MONITOR.tileY,
    tileW: CITY_01_ARENA_RANKING_MONITOR.tileW,
    tileH: CITY_01_ARENA_RANKING_MONITOR.tileH,
    action: WorldObjectAction.OPEN_RANKING_MONITOR,
  },
];

export function getWorldObjectsForMap(mapId: MapId): readonly WorldObjectDefinition[] {
  return WORLD_OBJECT_REGISTRY.filter((entry) => entry.mapId === mapId);
}

export function getWorldObjectById(objectId: string): WorldObjectDefinition | null {
  return WORLD_OBJECT_REGISTRY.find((entry) => entry.id === objectId) ?? null;
}
