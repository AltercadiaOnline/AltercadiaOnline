import city01MirrorJson from './maps/city01TiledMap.json' with { type: 'json' };
import city01PhaserJson from './maps/city01PhaserMap.json' with { type: 'json' };
import farmZone01MirrorJson from './maps/farmZone01TiledMap.json' with { type: 'json' };
import farmZone01PhaserJson from './maps/farmZone01PhaserMap.json' with { type: 'json' };
import type { MapId } from '../shared/world/mapRegistry.js';
import {
  MAP_MUND_EXPORT_REGISTRY,
  resolveMapMundPublicUrl,
} from './mapMundManifest.js';
import {
  extractObjectImagePathsFromTiledJson,
  extractTilesetsFromTiledJson,
  type PhaserReadyTiledMap,
  type TiledMapJson,
} from './tiledMapJson.js';import './bootstrapWorldCollision.js';
import { parseTiledMapPlacements } from '../shared/world/parseTiledMapPlacements.js';
import { setTiledMapPlacements } from '../shared/world/tiledMapPlacements.js';

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
   * JSON Phaser-ready gerado em `npm run mirror:map-mund` (*PhaserMap.json).
   * Tilesets embutidos, sem `source` — única fonte injetada no cache do Phaser.
   */
  readonly phaserMapData: PhaserReadyTiledMap | null;
};

type TiledMapMirrorBundle = {
  readonly mirror: TiledMapJson;
  readonly phaser: PhaserReadyTiledMap;
};

const TILED_MAP_BUNDLES_BY_ID: Partial<Record<MapId, TiledMapMirrorBundle>> = {
  city_01: {
    mirror: city01MirrorJson as TiledMapJson,
    phaser: city01PhaserJson as PhaserReadyTiledMap,
  },
  farm_zone_01: {
    mirror: farmZone01MirrorJson as TiledMapJson,
    phaser: farmZone01PhaserJson as PhaserReadyTiledMap,
  },
};

function buildTiledMapDescriptor(
  mapId: MapId,
  cacheKey: string,
  jsonUrl: string,
): TiledMapDescriptor {
  const bundle = TILED_MAP_BUNDLES_BY_ID[mapId];
  if (!bundle) {
    return {
      mapId,
      cacheKey,
      jsonUrl,
      tilesets: [],
      objectImages: [],
      phaserMapData: null,
    };
  }

  const { placements } = parseTiledMapPlacements(mapId, bundle.phaser);
  setTiledMapPlacements(mapId, placements);

  return {
    mapId,
    cacheKey,
    jsonUrl,
    tilesets: extractTilesetsFromTiledJson(bundle.mirror),
    objectImages: extractObjectImagePathsFromTiledJson(bundle.mirror),
    phaserMapData: bundle.phaser,
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

export function tiledTilesetTextureKey(mapCacheKey: string, tilesetName: string): string {
  return `${mapCacheKey}:ts:${tilesetName}`;
}

/** Sprites soltos referenciados por propriedade `image` em object layers. */
export function tiledObjectTextureKey(mapCacheKey: string, imagePath: string): string {
  const normalized = imagePath.replace(/\\/g, '/').replace(/^\/+/, '');
  return `${mapCacheKey}:obj:${normalized}`;
}
