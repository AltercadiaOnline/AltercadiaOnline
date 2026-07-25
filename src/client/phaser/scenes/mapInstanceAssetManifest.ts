// @ts-nocheck
import { isTiledMapEnabled, resolveTiledMapDescriptor, tiledObjectTextureKey, tiledTilesetTextureKey, } from '../../../config/tiledMapManifest.js';
import { getTiledAssetManager } from '../tiled/TiledAssetManager.js';
import { isTilemapCacheReady } from '../tiled/tilemapCacheReady.js';
/** Chaves de cache Phaser (tilemap + texturas) exclusivas de um mapa. */
export function collectMapInstanceAssetKeys(mapId) {
    const textureKeys = [];
    let tilemapKey = null;
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
export function queueMapInstanceAssets(scene, mapId) {
    if (isTiledMapEnabled(mapId)) {
        const descriptor = resolveTiledMapDescriptor(mapId);
        if (descriptor) {
            getTiledAssetManager().queueMapAssets(scene, descriptor);
        }
    }
    // Atlas zone1_top_down_creatures: carregado na PreloaderScene (asset crítico / preloaderGate).
    // Sprite do jogador: ensurePlayerSheetTexture() na montagem (PlayerSpriteLoader + metadata).
}
/**
 * Remove assets da instância anterior — texturas e tilemap JSON.
 * Spritesheet do jogador é compartilhado e não é removido aqui.
 */
export function purgeMapInstanceAssets(textures, tilemapCache, mapId) {
    if (!mapId)
        return;
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
