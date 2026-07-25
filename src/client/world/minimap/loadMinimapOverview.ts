// @ts-nocheck
import { resolveMinimapOverviewUrl } from './minimapOverviewUrls.js';
const imageCache = new Map();
function loadImage(url) {
    const cached = imageCache.get(url);
    if (cached)
        return cached;
    const promise = new Promise((resolve) => {
        if (typeof Image === 'undefined') {
            resolve(null);
            return;
        }
        const image = new Image();
        image.decoding = 'async';
        image.onload = () => resolve(image);
        image.onerror = () => {
            imageCache.delete(url);
            resolve(null);
        };
        image.src = url;
    });
    imageCache.set(url, promise);
    return promise;
}
/** Carrega overview WebP do mapa (cache por URL). Null = usar terrain procedural. */
export function loadMinimapOverview(mapId) {
    const url = resolveMinimapOverviewUrl(mapId);
    if (!url)
        return Promise.resolve(null);
    return loadImage(url);
}
export function clearMinimapOverviewCache() {
    imageCache.clear();
}
