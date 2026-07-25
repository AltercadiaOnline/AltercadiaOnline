// @ts-nocheck
import { assertCriticalPreloaderTextures, } from './preloaderCriticalAssets.js';
let preloaderReady = false;
let pendingMapLoading = null;
export function isPreloaderReady() {
    return preloaderReady;
}
/**
 * Libera o gate somente após atlases críticos (Road2 + criaturas) estarem no cache.
 * Sem `textures`, assume que a validação já ocorreu na PreloaderScene.
 */
export function markPreloaderReady(textures) {
    if (textures) {
        assertCriticalPreloaderTextures(textures);
    }
    preloaderReady = true;
}
export function resetPreloaderGate() {
    preloaderReady = false;
    pendingMapLoading = null;
}
export function requestMapLoadingAfterPreloader(data) {
    pendingMapLoading = data;
}
export function consumePendingMapLoading() {
    const data = pendingMapLoading;
    pendingMapLoading = null;
    return data;
}
