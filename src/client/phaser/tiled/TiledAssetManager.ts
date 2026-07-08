import type { TiledMapDescriptor } from '../../../config/tiledMapManifest.js';
import {
  tiledObjectTextureKey,
  tiledTilesetTextureKey,
} from '../../../config/tiledMapManifest.js';
import { resolveTiledPublicAssetUrl } from './tiledAssetPaths.js';
import {
  queueProcessedTilesetAtlas,
} from './processedTilesetPreload.js';
import {
  tiledSharedTilesetTextureKey,
  tiledTilesetLookupKey,
} from './tiledTextureKeys.js';
import type { PhaserTiledScene } from './phaserTiledMapTypes.js';

const TERRAIN_PATH_PREFIX = '/assets/terrain/';
const STRUCTURES_PATH_PREFIX = '/assets/structures/';
const PROPS_PATH_PREFIX = '/assets/props/';

/** Phaser.Tilemaps.Formats.TILED_JSON — estável há anos (Phaser 3/4). */
const PHASER_TILED_JSON_FORMAT = 1;

/**
 * Pré-carrega texturas referenciadas pelo export Tiled (/terrain, /structures, /props).
 *
 * Tilesets de grade: `load.image` na folha processada (PNG alinhado) — `load.atlas` quebra
 * tile layers do Phaser (addTilesetImage). Road2 (`road2_atlas`) vem da PreloaderScene.
 * Frames 0…N para createFromObjects são gerados depois em ensureTiledTilesetTextureFrames.
 *
 * PNGs idênticos carregam uma vez com chave compartilhada por URL.
 */
export class TiledAssetManager {
  /** tilesetName → textureKey efetiva (pode ser chave compartilhada por URL). */
  private readonly tilesetTextureKeyByLookup = new Map<string, string>();

  /** url pública → textureKey canônica (dedupe de preload). */
  private readonly sharedKeyByImageUrl = new Map<string, string>();

  queueMapAssets(scene: PhaserTiledScene, descriptor: TiledMapDescriptor): void {
    const queuedTextureKeys = new Set<string>();

    for (const tileset of descriptor.tilesets) {
      const publicUrl = resolveTiledPublicAssetUrl(descriptor.jsonUrl, tileset.imagePath);
      const lookupKey = tiledTilesetLookupKey(descriptor.cacheKey, tileset.name);

      const processedAtlasKey = queueProcessedTilesetAtlas(
        scene,
        publicUrl,
        queuedTextureKeys,
      );
      if (processedAtlasKey) {
        this.tilesetTextureKeyByLookup.set(lookupKey, processedAtlasKey);
        continue;
      }

      const sharedKey = this.resolveSharedTextureKey(descriptor.cacheKey, publicUrl);

      this.tilesetTextureKeyByLookup.set(lookupKey, sharedKey);
      this.queueTilesetTexture(scene, publicUrl, sharedKey, queuedTextureKeys);
    }

    for (const imagePath of descriptor.objectImages) {
      this.queueImage(
        scene,
        tiledObjectTextureKey(descriptor.cacheKey, imagePath),
        resolveTiledPublicAssetUrl(descriptor.jsonUrl, imagePath),
        queuedTextureKeys,
      );
    }

    this.registerTilemapData(scene, descriptor);
  }

  /**
   * Resolve a textura efetiva para bindTilesets — preferir chave compartilhada por URL.
   */
  resolveTilesetTextureKey(mapCacheKey: string, tilesetName: string): string | null {
    const lookupKey = tiledTilesetLookupKey(mapCacheKey, tilesetName);
    return this.tilesetTextureKeyByLookup.get(lookupKey) ?? null;
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

  private queueTilesetTexture(
    scene: PhaserTiledScene,
    publicUrl: string,
    textureKey: string,
    queued: Set<string>,
  ): void {
    if (queued.has(textureKey)) return;
    queued.add(textureKey);

    scene.load.image(textureKey, publicUrl);
  }

  private resolveSharedTextureKey(mapCacheKey: string, publicUrl: string): string {
    const normalizedUrl = publicUrl.replace(/\\/g, '/');
    const cached = this.sharedKeyByImageUrl.get(normalizedUrl);
    if (cached) return cached;

    const sharedKey = tiledSharedTilesetTextureKey(mapCacheKey, normalizedUrl);
    this.sharedKeyByImageUrl.set(normalizedUrl, sharedKey);
    return sharedKey;
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

/** Limpa registro de aliases — útil ao trocar de instância de mapa. */
export function resetTiledAssetManager(): void {
  activeManager = null;
}
