// @ts-nocheck
import { PHASER_TEXTURE_FILTER_NEAREST } from '../player/phaserPlayerAssets.js';
const imageCache = new Map();
function textureKeyForUrl(url) {
    return `battle-sprite:${url}`;
}
async function loadHtmlImage(url) {
    const cached = imageCache.get(url);
    if (cached?.complete && cached.naturalWidth > 0) {
        return cached;
    }
    return new Promise((resolve) => {
        const img = new Image();
        img.decoding = 'async';
        img.onload = () => {
            imageCache.set(url, img);
            resolve(img);
        };
        img.onerror = () => {
            console.error('ERRO AO CARREGAR:', textureKeyForUrl(url), 'Caminho:', url);
            resolve(null);
        };
        img.src = url;
    });
}
/** Carrega URL side-view no cache de texturas Phaser (pixel-perfect). */
export async function ensureBattleSpriteTexture(textures, primaryUrl, fallbackUrls = []) {
    const candidates = [primaryUrl, ...fallbackUrls].filter((url) => url.length > 0);
    for (const url of candidates) {
        const key = textureKeyForUrl(url);
        if (textures.exists(key)) {
            return key;
        }
        const image = await loadHtmlImage(url);
        if (!image)
            continue;
        textures.addImage(key, image);
        try {
            textures.get(key).setFilter(PHASER_TEXTURE_FILTER_NEAREST);
        }
        catch {
            /* noop */
        }
        return key;
    }
    return null;
}
export function clearBattleTextureImageCache() {
    imageCache.clear();
}
