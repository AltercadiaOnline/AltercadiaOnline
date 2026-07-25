// @ts-nocheck
import { computeTilesetFrameCapacity, findTilesetForGid, stripTiledGidFlags, } from './tilesetBindDiagnostics.js';
/** JSON do mapa — somente memória (descriptor ou cache.tilemap). Nunca `scene.load`. */
export function readTilemapJsonFromMemory(scene, cacheKey, descriptor) {
    if (descriptor.phaserMapData) {
        return descriptor.phaserMapData;
    }
    const cached = scene.cache.tilemap.get(cacheKey);
    if (!cached?.data || typeof cached.data !== 'object') {
        return null;
    }
    return cached.data;
}
export function isTextureFrameReady(textures, textureKey, frameIndex) {
    if (!textures.exists(textureKey))
        return false;
    if (frameIndex < 0)
        return false;
    try {
        const texture = textures.get(textureKey);
        if (texture.has?.(frameIndex) || texture.has?.(String(frameIndex))) {
            return true;
        }
        const total = Number(texture.frameTotal ?? 0);
        return frameIndex === 0 || (total > 0 && frameIndex < total);
    }
    catch {
        return false;
    }
}
export function resolveGidTextureFrame(textures, rawGid, cachedTilesets, resolveTextureKeyForTileset, missingGidTextureKey, ensureMissingGidTexture) {
    const gid = stripTiledGidFlags(rawGid);
    if (gid <= 0)
        return null;
    const resolved = findTilesetForGid(cachedTilesets, gid);
    if (!resolved?.entry.name) {
        ensureMissingGidTexture();
        return {
            textureKey: missingGidTextureKey,
            frameIndex: 0,
            tilesetName: 'unknown',
            usedErrorTile: true,
        };
    }
    const tilesetName = resolved.entry.name;
    const textureKey = resolveTextureKeyForTileset(tilesetName);
    const { localIndex } = resolved;
    const margin = Number(resolved.entry.margin ?? 0);
    const spacing = Number(resolved.entry.spacing ?? 0);
    const tileWidth = Number(resolved.entry.tilewidth ?? 32);
    const tileHeight = Number(resolved.entry.tileheight ?? 32);
    const imageWidth = Number(resolved.entry.imagewidth ?? 0);
    const imageHeight = Number(resolved.entry.imageheight ?? 0);
    const columns = Number(resolved.entry.columns ?? 0);
    const tilecount = Number(resolved.entry.tilecount ?? 0);
    const capacity = computeTilesetFrameCapacity(tileWidth, tileHeight, margin, spacing, imageWidth, imageHeight, columns);
    const frameInRange = localIndex >= 0
        && localIndex < tilecount
        && localIndex < capacity.maxFrames;
    if (textureKey
        && frameInRange
        && isTextureFrameReady(textures, textureKey, localIndex)) {
        return {
            textureKey,
            frameIndex: localIndex,
            tilesetName,
            usedErrorTile: false,
        };
    }
    const columnCount = columns > 0
        ? columns
        : Math.max(1, capacity.columns);
    if (textureKey && textures.exists(textureKey) && frameInRange && columnCount > 0) {
        const column = localIndex % columnCount;
        const row = Math.floor(localIndex / columnCount);
        const cropX = margin + column * (tileWidth + spacing);
        const cropY = margin + row * (tileHeight + spacing);
        if (cropX + tileWidth <= imageWidth
            && cropY + tileHeight <= imageHeight) {
            return {
                textureKey,
                frameIndex: 0,
                tilesetName,
                usedErrorTile: false,
                cropRect: {
                    x: cropX,
                    y: cropY,
                    width: tileWidth,
                    height: tileHeight,
                },
            };
        }
    }
    ensureMissingGidTexture();
    return {
        textureKey: missingGidTextureKey,
        frameIndex: 0,
        tilesetName,
        usedErrorTile: true,
    };
}
