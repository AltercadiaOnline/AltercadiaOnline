// @ts-nocheck
import { PROCESSED_SPRITE_ATLASES } from './processedAssetManifest.js';
/** Chave Phaser para o atlas gerado por `npm run generate-assets`. */
export const ZONE1_TOPDOWN_CREATURES_ATLAS_KEY = 'zone1-topdown-creatures';
export function resolveZone1ProcessedCreatureAtlas() {
    const entry = PROCESSED_SPRITE_ATLASES.find((atlas) => atlas.atlasUrl.includes('zone1_top_down_creatures'));
    if (!entry)
        return null;
    return { imageUrl: entry.imageUrl, atlasUrl: entry.atlasUrl };
}
