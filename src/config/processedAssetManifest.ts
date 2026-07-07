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

export const PROCESSED_TILESET_BY_SOURCE_URL: Readonly<Record<string, ProcessedTilesetEntry>> = {
  "/assets/terrain/tiles/craftpix-net-574220-free-path-and-road-top-down-pixel-tileset/PNG_Tiled/Road1.png": {
    "sourceUrl": "/assets/terrain/tiles/craftpix-net-574220-free-path-and-road-top-down-pixel-tileset/PNG_Tiled/Road1.png",
    "imageUrl": "/assets/processed/tilesets/Road1.png",
    "atlasUrl": "/assets/processed/tilesets/Road1.json",
    "tileWidth": 32,
    "tileHeight": 32,
    "columns": 7,
    "tilecount": 91,
    "alignedWidth": 256,
    "alignedHeight": 416
  },
  "/assets/terrain/tiles/craftpix-net-574220-free-path-and-road-top-down-pixel-tileset/PNG_Tiled/Road2.png": {
    "sourceUrl": "/assets/terrain/tiles/craftpix-net-574220-free-path-and-road-top-down-pixel-tileset/PNG_Tiled/Road2.png",
    "imageUrl": "/assets/processed/tilesets/Road2.png",
    "atlasUrl": "/assets/processed/tilesets/Road2.json",
    "tileWidth": 32,
    "tileHeight": 32,
    "columns": 7,
    "tilecount": 91,
    "alignedWidth": 256,
    "alignedHeight": 416
  },
  "/assets/terrain/tiles/craftpix-net-574220-free-path-and-road-top-down-pixel-tileset/PNG_Tiled/Road3_grass.png": {
    "sourceUrl": "/assets/terrain/tiles/craftpix-net-574220-free-path-and-road-top-down-pixel-tileset/PNG_Tiled/Road3_grass.png",
    "imageUrl": "/assets/processed/tilesets/Road3_grass.png",
    "atlasUrl": "/assets/processed/tilesets/Road3_grass.json",
    "tileWidth": 32,
    "tileHeight": 32,
    "columns": 7,
    "tilecount": 105,
    "alignedWidth": 256,
    "alignedHeight": 480
  },
  "/assets/terrain/tiles/craftpix-net-574220-free-path-and-road-top-down-pixel-tileset/PNG_Tiled/Road4_ground.png": {
    "sourceUrl": "/assets/terrain/tiles/craftpix-net-574220-free-path-and-road-top-down-pixel-tileset/PNG_Tiled/Road4_ground.png",
    "imageUrl": "/assets/processed/tilesets/Road4_ground.png",
    "atlasUrl": "/assets/processed/tilesets/Road4_ground.json",
    "tileWidth": 32,
    "tileHeight": 32,
    "columns": 7,
    "tilecount": 105,
    "alignedWidth": 256,
    "alignedHeight": 480
  }
} as const;

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
