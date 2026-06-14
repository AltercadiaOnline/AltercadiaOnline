import type { CombatClassId } from '../types.js';
import { CITY_01_ID } from './maps/city01.js';
import { CITY_01_ARENA_CORE } from './maps/city01LayoutConstants.js';
import type { MapId } from './mapRegistry.js';

export const PVP_DUELIST_ID_PREFIX = 'pvp_duelist_';

export type PvpDuelistRegistryEntry = {
  readonly id: string;
  readonly displayName: string;
  readonly classId: CombatClassId;
  readonly mapId: MapId;
  readonly tileX: number;
  readonly tileY: number;
  readonly level: number;
};

/** Dois duelistas de teste — anel da arena central (city01), sem afetar criaturas PVE. */
export const PVP_DUELIST_REGISTRY: readonly PvpDuelistRegistryEntry[] = [
  {
    id: `${PVP_DUELIST_ID_PREFIX}alpha`,
    displayName: 'BOT_Assaltante_ARENA',
    classId: 'IMPETUS',
    mapId: CITY_01_ID,
    tileX: CITY_01_ARENA_CORE.tileX - 2,
    tileY: CITY_01_ARENA_CORE.tileY,
    level: 12,
  },
  {
    id: `${PVP_DUELIST_ID_PREFIX}beta`,
    displayName: 'BOT_Tecnomante_ARENA',
    classId: 'COGITOR',
    mapId: CITY_01_ID,
    tileX: CITY_01_ARENA_CORE.tileX + 2,
    tileY: CITY_01_ARENA_CORE.tileY,
    level: 12,
  },
] as const;

export function getPvpDuelistEntry(duelistId: string): PvpDuelistRegistryEntry | undefined {
  return PVP_DUELIST_REGISTRY.find((entry) => entry.id === duelistId);
}

export function getPvpDuelistsForMap(mapId: MapId): readonly PvpDuelistRegistryEntry[] {
  return PVP_DUELIST_REGISTRY.filter((entry) => entry.mapId === mapId);
}

export function buildPvpArenaEncounter(duelistId: string): {
  readonly duelistId: string;
  readonly duelistName: string;
  readonly mapId: MapId;
  readonly tileX: number;
  readonly tileY: number;
  readonly battleMode: 'PVP_ARENA';
} | null {
  const entry = getPvpDuelistEntry(duelistId);
  if (!entry) return null;
  return {
    duelistId: entry.id,
    duelistName: entry.displayName,
    mapId: entry.mapId,
    tileX: entry.tileX,
    tileY: entry.tileY,
    battleMode: 'PVP_ARENA',
  };
}
