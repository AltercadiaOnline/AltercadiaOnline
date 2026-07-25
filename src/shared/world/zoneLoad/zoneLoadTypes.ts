import type { MapId } from '../mapRegistry.js';
import { CITY_01_ID } from '../maps/city01.js';
import { FARM_ZONE_01_ID } from '../maps/farm_zone_01.js';

/** Fase de runtime por zona — separado de “mapa permitido no shard”. */
export type ZoneLoadPhase = 'idle' | 'loading' | 'ready' | 'failed';

/** Módulos que um ensure pode aquecer (extensível). */
export type ZoneLoadModuleId =
  | 'monsters'
  | 'sprites'
  | 'collision'
  | 'construct-layout';

export type ZoneEnsurePayload = {
  readonly mapId: MapId;
  /** Subconjunto opcional — default = módulos padrão da zona. */
  readonly modules?: readonly ZoneLoadModuleId[];
};

export type ZoneEnsureResultData = {
  readonly mapId: MapId;
  readonly phase: ZoneLoadPhase;
  readonly modules: readonly ZoneLoadModuleId[];
};

/** Zonas de hunt (PvE) — adiadas até city ready ou login já na farm. */
export const HUNT_ZONE_MAP_IDS: readonly MapId[] = [FARM_ZONE_01_ID];

export function isHuntZoneMapId(mapId: string): boolean {
  return (HUNT_ZONE_MAP_IDS as readonly string[]).includes(mapId);
}

export function isCityMapId(mapId: string): boolean {
  return mapId === CITY_01_ID;
}

/** Módulos padrão ao garantir uma zona. */
export function defaultModulesForZone(mapId: MapId): readonly ZoneLoadModuleId[] {
  if (mapId === FARM_ZONE_01_ID) {
    return ['monsters', 'sprites', 'collision'];
  }
  if (mapId === CITY_01_ID) {
    return ['collision', 'construct-layout'];
  }
  return ['collision'];
}
