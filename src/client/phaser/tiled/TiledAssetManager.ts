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

    scene.load.tilemapTiledJSON(descriptor.cacheKey, descriptor.jsonUrl);
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
