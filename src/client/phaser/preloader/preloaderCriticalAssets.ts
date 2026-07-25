// @ts-nocheck
import { ZONE1_TOPDOWN_CREATURES_ATLAS_KEY } from '../../../config/zone1ProcessedCreatureAtlas.js';
import { ROAD2_ATLAS_TEXTURE_KEY } from '../tiled/processedTilesetPreload.js';
/** Atlases carregados exclusivamente na PreloaderScene — bloqueiam `preloaderGate`. */
export const PRELOADER_CRITICAL_TEXTURE_KEYS = [
    ROAD2_ATLAS_TEXTURE_KEY,
    ZONE1_TOPDOWN_CREATURES_ATLAS_KEY,
];
export function isPreloaderCriticalTextureKey(key) {
    return PRELOADER_CRITICAL_TEXTURE_KEYS.includes(key);
}
export function getMissingCriticalPreloaderTextures(textures) {
    return PRELOADER_CRITICAL_TEXTURE_KEYS.filter((key) => !textures.exists(key));
}
/** Falha imediata se Road2 ou atlas de criaturas não estiverem no cache Phaser. */
export function assertCriticalPreloaderTextures(textures) {
    const missing = getMissingCriticalPreloaderTextures(textures);
    if (missing.length === 0)
        return;
    throw new Error(`[preloaderGate] Assets críticos ausentes no cache Phaser: ${missing.join(', ')}. `
        + 'Rode npm run generate-assets e confira a PreloaderScene.');
}
