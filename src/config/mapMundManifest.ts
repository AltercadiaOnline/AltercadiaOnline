import { CITY_01_ID } from '../shared/world/maps/city01.js';
import { FARM_ZONE_01_ID } from '../shared/world/maps/farm_zone_01.js';
import type { MapId } from '../shared/world/mapRegistry.js';

/**
 * Pasta canônica de exportação Tiled — única fonte de mapas em `public/`.
 *
 * Designer: exportar .tmj ou .json direto para `public/assets/map_mund/`.
 *
 * Pipeline de build (automático em `npm run build`):
 * 1. `mirror:map-mund` — resolve .tsx → espelho + artefato Phaser-ready em `src/config/maps/*PhaserMap.json`
 * 2. `audit:map-mund` — valida tilesets, imagens e ausência de `source`
 * 3. `build:sync` — copia espelhos para `public/config/maps/`
 *
 * O Phaser **nunca** parseia o `.tmj` cru (tilesets externos `.tsx` são ignorados pelo parser).
 */
export const MAP_MUND_PUBLIC_BASE = '/assets/map_mund';

export type MapMundExportEntry = {
  readonly mapId: MapId;
  /** Arquivo exportado pelo Tiled em public/assets/map_mund/ (.tmj ou .json). */
  readonly exportFileName: string;
  /** Espelho em src/config/maps/ — metadados de preload (tilesets + object images). */
  readonly mirrorBasename: string;
  /** Artefato Phaser-ready (sem `source`, GIDs ajustados) — única fonte do parser em runtime. */
  readonly phaserBasename: string;
  readonly cacheKey: string;
};

export const MAP_MUND_EXPORT_REGISTRY: readonly MapMundExportEntry[] = [
  {
    mapId: CITY_01_ID,
    exportFileName: 'city_01_test.tmj',
    mirrorBasename: 'city01TiledMap.json',
    phaserBasename: 'city01PhaserMap.json',
    cacheKey: 'tiled-city_01',
  },
  {
    mapId: FARM_ZONE_01_ID,
    exportFileName: 'zona_beco_dos_fundos_tilemap.tmj',
    mirrorBasename: 'farmZone01TiledMap.json',
    phaserBasename: 'farmZone01PhaserMap.json',
    cacheKey: 'tiled-farm_zone_01',
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
