import { CITY_01_ID } from '../shared/world/maps/city01.js';
import { FARM_ZONE_01_ID } from '../shared/world/maps/farm_zone_01.js';
import type { MapId } from '../shared/world/mapRegistry.js';

/**
 * Referência de exports do designer em public/assets/map_mund/.
 * Usado apenas pelo pipeline de assets (generate-assets) — não é runtime.
 */
export const MAP_MUND_PUBLIC_BASE = '/assets/map_mund';

export type MapMundExportEntry = {
  readonly mapId: MapId;
  /** Arquivo em public/assets/map_mund/ (.tmj ou .json) — referência de arte/tilesets. */
  readonly exportFileName: string;
};

export const MAP_MUND_EXPORT_REGISTRY: readonly MapMundExportEntry[] = [
  {
    mapId: CITY_01_ID,
    exportFileName: 'city_01_test.tmj',
  },
  {
    mapId: FARM_ZONE_01_ID,
    exportFileName: 'zona_beco_dos_fundos_tilemap.tmj',
  },
] as const;

export function resolveMapMundPublicUrl(exportFileName: string): string {
  return `${MAP_MUND_PUBLIC_BASE}/${exportFileName}`;
}

export function resolveMapMundExportForMapId(mapId: MapId): MapMundExportEntry | null {
  return MAP_MUND_EXPORT_REGISTRY.find((entry) => entry.mapId === mapId) ?? null;
}

export function listMapMundExportMapIds(): readonly MapId[] {
  return MAP_MUND_EXPORT_REGISTRY.map((entry) => entry.mapId);
}
