/**
 * Manifest gerado por `npm run generate-assets` (scripts/generateAtlas.ts).
 * NÃO editar manualmente — rode o script após alterar PNGs de origem.
 */
export type ProcessedTilesetEntry = {
  readonly imageUrl: string;
  readonly atlasUrl: string;
  readonly tileWidth: number;
  readonly tileHeight: number;
  readonly columns: number;
  readonly tilecount: number;
  readonly alignedWidth: number;
  readonly alignedHeight: number;
  readonly sourceUrl: string;
};

export type ProcessedSpriteAtlasEntry = {
  readonly imageUrl: string;
  readonly atlasUrl: string;
  readonly frameCount: number;
};

export const PROCESSED_TILESET_BY_SOURCE_URL: Readonly<Record<string, ProcessedTilesetEntry>> = {} as const;

export const PROCESSED_SPRITE_ATLASES: readonly ProcessedSpriteAtlasEntry[] = [
  {
    "imageUrl": "/assets/processed/creatures/zone1_top_down_creatures.png",
    "atlasUrl": "/assets/processed/creatures/zone1_top_down_creatures.json",
    "frameCount": 40
  }
] as const;

export function resolveProcessedTilesetAsset(
  sourcePublicUrl: string,
): ProcessedTilesetEntry | null {
  return PROCESSED_TILESET_BY_SOURCE_URL[sourcePublicUrl] ?? null;
}
