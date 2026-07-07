/**
 * Resolve caminhos de imagem exportados pelo Tiled para URLs públicas em /assets/.
 * Tilesets processados (npm run generate-assets) redirecionam para /assets/processed/.
 */
import { resolveProcessedTilesetAsset } from '../../../config/processedAssetManifest.js';
import { resolveTiledImagePublicUrl } from '../../../config/resolveTiledImagePublicUrl.js';

export function resolveTiledPublicAssetUrl(mapJsonUrl: string, tiledImagePath: string): string {
  const publicUrl = resolveTiledImagePublicUrl(mapJsonUrl, tiledImagePath);
  return resolveProcessedTilesetAsset(publicUrl)?.imageUrl ?? publicUrl;
}

/** Atlas JSONArray (Phaser) para tileset processado, se existir no manifest de build. */
export function resolveProcessedTilesetAtlasUrl(sourcePublicUrl: string): string | null {
  return resolveProcessedTilesetAsset(sourcePublicUrl)?.atlasUrl ?? null;
}

/** URL de origem (sem redirect) — útil para lookup no manifest processado. */
export function resolveTiledSourcePublicUrl(mapJsonUrl: string, tiledImagePath: string): string {
  return resolveTiledImagePublicUrl(mapJsonUrl, tiledImagePath);
}
