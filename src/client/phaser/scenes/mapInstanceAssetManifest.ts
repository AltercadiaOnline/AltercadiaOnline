import type { MapId } from '../../../shared/world/mapRegistry.js';
import {
  isTiledMapEnabled,
  resolveTiledMapDescriptor,
  tiledObjectTextureKey,
  tiledTilesetTextureKey,
} from '../../../config/tiledMapManifest.js';
import { getTiledAssetManager } from '../tiled/TiledAssetManager.js';
import { isTilemapCacheReady } from '../tiled/tilemapCacheReady.js';
import type { PhaserTiledScene } from '../tiled/phaserTiledMapTypes.js';

export type MapInstanceAssetKeys = {
  readonly tilemapKey: string | null;
  readonly textureKeys: readonly string[];
};

type TextureCache = {
  exists: (key: string) => boolean;
  remove: (key: string) => void;
};

type TilemapCache = {
  has?: (key: string) => boolean;
  exists?: (key: string) => boolean;
  remove: (key: string) => void;
};

type AssetQueueScene = {
  readonly load: PhaserTiledScene['load'] & {
    /** Phaser: `load.atlas(key, textureURL, atlasURL)` — PNG antes do JSON. */
    atlas?: (key: string, textureUrl: string, atlasUrl: string) => void;
  };
  readonly textures: TextureCache;
};

/** Chaves de cache Phaser (tilemap + texturas) exclusivas de um mapa. */
export function collectMapInstanceAssetKeys(mapId: MapId): MapInstanceAssetKeys {
  const textureKeys: string[] = [];
  let tilemapKey: string | null = null;

  const descriptor = resolveTiledMapDescriptor(mapId);
  if (!descriptor) {
    return { tilemapKey, textureKeys };
  }

  tilemapKey = descriptor.cacheKey;

  for (const tileset of descriptor.tilesets) {
    textureKeys.push(tiledTilesetTextureKey(descriptor.cacheKey, tileset.name));
  }

  for (const imagePath of descriptor.objectImages) {
    textureKeys.push(tiledObjectTextureKey(descriptor.cacheKey, imagePath));
  }

  return { tilemapKey, textureKeys };
}

/** Enfileira JSON Tiled, tilesets e props para a instância alvo. */
export function queueMapInstanceAssets(scene: AssetQueueScene, mapId: MapId): void {
  if (isTiledMapEnabled(mapId)) {
    const descriptor = resolveTiledMapDescriptor(mapId);
    if (descriptor) {
      getTiledAssetManager().queueMapAssets(scene as unknown as PhaserTiledScene, descriptor);
    }
  }

  // Atlas zone1_top_down_creatures: carregado na PreloaderScene (asset crítico / preloaderGate).
  // Sprite do jogador: ensurePlayerSheetTexture() na montagem (PlayerSpriteLoader + metadata).
}

/**
 * Remove assets da instância anterior — texturas e tilemap JSON.
 * Spritesheet do jogador é compartilhado e não é removido aqui.
 */
export function purgeMapInstanceAssets(
  textures: TextureCache,
  tilemapCache: TilemapCache,
  mapId: MapId | null | undefined,
): void {
  if (!mapId) return;

  const { tilemapKey, textureKeys } = collectMapInstanceAssetKeys(mapId);

  for (const key of textureKeys) {
    if (textures.exists(key)) {
      textures.remove(key);
    }
  }

  if (tilemapKey && isTilemapCacheReady(tilemapCache, tilemapKey)) {
    tilemapCache.remove(tilemapKey);
  }
}
