import type { TiledMapDescriptor } from '../../../config/tiledMapManifest.js';
import {
  tiledObjectTextureKey,
  tiledTilesetTextureKey,
} from '../../../config/tiledMapManifest.js';
import { resolveTiledPublicAssetUrl } from './tiledAssetPaths.js';
import type { PhaserTiledScene } from './phaserTiledMapTypes.js';

const TERRAIN_PATH_PREFIX = '/assets/terrain/';
const STRUCTURES_PATH_PREFIX = '/assets/structures/';
const PROPS_PATH_PREFIX = '/assets/props/';

/** Phaser.Tilemaps.Formats.TILED_JSON — estável há anos (Phaser 3/4). */
const PHASER_TILED_JSON_FORMAT = 1;

/**
 * Pré-carrega texturas referenciadas pelo export Tiled (/terrain, /structures, /props).
 * Novos PNGs nas pastas entram automaticamente quando o JSON é espelhado no build.
 */
export class TiledAssetManager {
  queueMapAssets(scene: PhaserTiledScene, descriptor: TiledMapDescriptor): void {
    const queued = new Set<string>();

    for (const tileset of descriptor.tilesets) {
      this.queueImage(
        scene,
        tiledTilesetTextureKey(descriptor.cacheKey, tileset.name),
        resolveTiledPublicAssetUrl(descriptor.jsonUrl, tileset.imagePath),
        queued,
      );
    }

    for (const imagePath of descriptor.objectImages) {
      this.queueImage(
        scene,
        tiledObjectTextureKey(descriptor.cacheKey, imagePath),
        resolveTiledPublicAssetUrl(descriptor.jsonUrl, imagePath),
        queued,
      );
    }

    this.registerTilemapData(scene, descriptor);
  }

  /**
   * Disponibiliza o tilemap no cache do Phaser. Preferimos injetar o JSON enriquecido
   * (tilesets embutidos, sem `source`) — o `.tmj` cru referencia tilesets externos `.tsx`
   * que o parser do Phaser ignora, deixando o mapa sem nenhum tileset vinculado.
   */
  ensureEnrichedTilemapInCache(scene: PhaserTiledScene, descriptor: TiledMapDescriptor): void {
    if (!descriptor.phaserMapData) {
      throw new Error(
        `[TiledAssetManager] Artefato Phaser ausente para "${descriptor.mapId}" — rode npm run mirror:map-mund e npm run build.`,
      );
    }

    const cache = scene.cache.tilemap;
    if (cache.has?.(descriptor.cacheKey) || cache.exists?.(descriptor.cacheKey)) {
      cache.remove(descriptor.cacheKey);
    }

    cache.add(descriptor.cacheKey, {
      format: PHASER_TILED_JSON_FORMAT,
      data: descriptor.phaserMapData,
    });
  }

  private registerTilemapData(scene: PhaserTiledScene, descriptor: TiledMapDescriptor): void {
    this.ensureEnrichedTilemapInCache(scene, descriptor);
  }

  tilesetTextureKey(mapCacheKey: string, tilesetName: string): string {
    return tiledTilesetTextureKey(mapCacheKey, tilesetName);
  }

  objectTextureKey(mapCacheKey: string, imagePath: string): string {
    return tiledObjectTextureKey(mapCacheKey, imagePath);
  }

  resolvePublicUrl(mapJsonUrl: string, tiledImagePath: string): string {
    return resolveTiledPublicAssetUrl(mapJsonUrl, tiledImagePath);
  }

  classifyAssetFolder(publicUrl: string): 'terrain' | 'structures' | 'props' | 'other' {
    if (publicUrl.includes(TERRAIN_PATH_PREFIX)) return 'terrain';
    if (publicUrl.includes(STRUCTURES_PATH_PREFIX)) return 'structures';
    if (publicUrl.includes(PROPS_PATH_PREFIX)) return 'props';
    return 'other';
  }

  private queueImage(
    scene: PhaserTiledScene,
    textureKey: string,
    url: string,
    queued: Set<string>,
  ): void {
    if (queued.has(textureKey)) return;
    queued.add(textureKey);
    scene.load.image(textureKey, url);
  }
}

let activeManager: TiledAssetManager | null = null;

export function getTiledAssetManager(): TiledAssetManager {
  if (!activeManager) activeManager = new TiledAssetManager();
  return activeManager;
}
