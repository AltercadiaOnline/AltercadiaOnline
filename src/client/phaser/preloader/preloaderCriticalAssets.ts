import { ZONE1_TOPDOWN_CREATURES_ATLAS_KEY } from '../../../config/zone1ProcessedCreatureAtlas.js';
import { ROAD2_ATLAS_TEXTURE_KEY } from '../tiled/processedTilesetPreload.js';

/** Atlases carregados exclusivamente na PreloaderScene — bloqueiam `preloaderGate`. */
export const PRELOADER_CRITICAL_TEXTURE_KEYS = [
  ROAD2_ATLAS_TEXTURE_KEY,
  ZONE1_TOPDOWN_CREATURES_ATLAS_KEY,
] as const;

export type PreloaderCriticalTextureKey = (typeof PRELOADER_CRITICAL_TEXTURE_KEYS)[number];

type TextureProbe = {
  exists: (key: string) => boolean;
};

export function isPreloaderCriticalTextureKey(key: string): key is PreloaderCriticalTextureKey {
  return (PRELOADER_CRITICAL_TEXTURE_KEYS as readonly string[]).includes(key);
}

export function getMissingCriticalPreloaderTextures(textures: TextureProbe): string[] {
  return PRELOADER_CRITICAL_TEXTURE_KEYS.filter((key) => !textures.exists(key));
}

/** Falha imediata se Road2 ou atlas de criaturas não estiverem no cache Phaser. */
export function assertCriticalPreloaderTextures(textures: TextureProbe): void {
  const missing = getMissingCriticalPreloaderTextures(textures);
  if (missing.length === 0) return;

  throw new Error(
    `[preloaderGate] Assets críticos ausentes no cache Phaser: ${missing.join(', ')}. `
    + 'Rode npm run generate-assets e confira a PreloaderScene.',
  );
}
