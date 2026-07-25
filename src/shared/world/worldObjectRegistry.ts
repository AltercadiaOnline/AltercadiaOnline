import type { MapId } from './mapRegistry.js';
import { CITY_01_COMPUTADOR_ARENA } from './maps/city01LayoutConstants.js';

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

/**
 * Objetos de mundo clicáveis separados de NPCs.
 * Hubs de mecânica → terminais `computador_*` (ver worldTerminalCatalog).
 */
export const WORLD_OBJECT_REGISTRY: readonly WorldObjectDefinition[] = [];

export function getWorldObjectsForMap(mapId: MapId): readonly WorldObjectDefinition[] {
  return WORLD_OBJECT_REGISTRY.filter((entry) => entry.mapId === mapId);
}

export function getWorldObjectById(objectId: string): WorldObjectDefinition | null {
  return WORLD_OBJECT_REGISTRY.find((entry) => entry.id === objectId) ?? null;
}

/** @deprecated Use WORLD_TERMINAL_IDS.ARENA */
export const ARENA_COMPUTER_NPC_ID = CITY_01_COMPUTADOR_ARENA.id;
