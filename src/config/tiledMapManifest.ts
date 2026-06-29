import city01TiledJson from './maps/city01TiledMap.json' with { type: 'json' };
import farmZone01TiledJson from './maps/farmZone01TiledMap.json' with { type: 'json' };
import type { MapId } from '../shared/world/mapRegistry.js';
import {
  MAP_MUND_EXPORT_REGISTRY,
  resolveMapMundPublicUrl,
} from './mapMundManifest.js';
import {
  buildPhaserTiledMapData,
  extractObjectImagePathsFromTiledJson,
  extractTilesetsFromTiledJson,
  type PhaserReadyTiledMap,
  type TiledMapJson,
} from './tiledMapJson.js';

export type TiledTilesetDescriptor = {
  readonly name: string;
  readonly imagePath: string;
};

export type TiledMapDescriptor = {
  readonly mapId: MapId;
  readonly cacheKey: string;
  readonly jsonUrl: string;
  /** Tilesets lidos do espelho (map_mund → src/config/maps) — preload automático. */
  readonly tilesets: readonly TiledTilesetDescriptor[];
  /** Sprites soltos (object layer com propriedade image). */
  readonly objectImages: readonly string[];
  /**
   * JSON do mapa pronto para o parser do Phaser (tilesets embutidos, sem `source`).
   * Injetado direto no cache de tilemap — o `.tmj` cru usa tilesets externos `.tsx`
   * que o Phaser não consegue carregar. `null` quando não há espelho disponível.
   */
  readonly phaserMapData: PhaserReadyTiledMap | null;
};

const TILED_MAP_JSON_BY_ID: Partial<Record<MapId, TiledMapJson>> = {
  city_01: city01TiledJson as TiledMapJson,
  farm_zone_01: farmZone01TiledJson as TiledMapJson,
};

function buildTiledMapDescriptor(
  mapId: MapId,
  cacheKey: string,
  jsonUrl: string,
): TiledMapDescriptor {
  const json = TILED_MAP_JSON_BY_ID[mapId];
  return {
    mapId,
    cacheKey,
    jsonUrl,
    tilesets: json ? extractTilesetsFromTiledJson(json) : [],
    objectImages: json ? extractObjectImagePathsFromTiledJson(json) : [],
    phaserMapData: json ? buildPhaserTiledMapData(json) : null,
  };
}

/** Mapas renderizados via export Tiled em public/assets/map_mund/ (Phaser). */
export const TILED_MAP_DESCRIPTORS: Partial<Record<MapId, TiledMapDescriptor>> = Object.fromEntries(
  MAP_MUND_EXPORT_REGISTRY.map((entry) => [
    entry.mapId,
    buildTiledMapDescriptor(
      entry.mapId,
      entry.cacheKey,
      resolveMapMundPublicUrl(entry.exportFileName),
    ),
  ]),
);

export function resolveTiledMapDescriptor(mapId: MapId): TiledMapDescriptor | null {
  return TILED_MAP_DESCRIPTORS[mapId] ?? null;
}

export function isTiledMapEnabled(mapId: MapId): boolean {
  return resolveTiledMapDescriptor(mapId) !== null;
}

export function listTiledMapIds(): readonly MapId[] {
  return Object.keys(TILED_MAP_DESCRIPTORS) as MapId[];
}

/** Mapas sem export Tiled em map_mund — renderer procedural legado. */
export function usesLegacyWorldRenderer(mapId: MapId): boolean {
  return !isTiledMapEnabled(mapId);
}

export function tiledTilesetTextureKey(mapCacheKey: string, tilesetName: string): string {
  return `${mapCacheKey}:ts:${tilesetName}`;
}

/** Sprites soltos referenciados por propriedade `image` em object layers. */
export function tiledObjectTextureKey(mapCacheKey: string, imagePath: string): string {
  const normalized = imagePath.replace(/\\/g, '/').replace(/^\/+/, '');
  return `${mapCacheKey}:obj:${normalized}`;
}
