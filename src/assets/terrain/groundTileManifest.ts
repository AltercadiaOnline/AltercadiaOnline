/**
 * Tiles de chão urbanos — 32×32 px, tileáveis, alpha limpo.
 */
export const GROUND_TILE_PUBLIC_BASE = '/assets/terrain/tiles';

export type GroundTileId = 'ground_grass' | 'ground_plaza' | 'ground_road';

export type GroundTileSpec = {
  readonly id: GroundTileId;
  readonly fileName: string;
  readonly widthPx: 32;
  readonly heightPx: 32;
  readonly placeholderType: 'GRASS' | 'PLAZA' | 'ROAD_TILE';
};

export const GROUND_TILE_SPECS: readonly GroundTileSpec[] = [
  { id: 'ground_grass', fileName: 'ground_grass.png', widthPx: 32, heightPx: 32, placeholderType: 'GRASS' },
  { id: 'ground_plaza', fileName: 'ground_plaza.png', widthPx: 32, heightPx: 32, placeholderType: 'PLAZA' },
  { id: 'ground_road', fileName: 'ground_road.png', widthPx: 32, heightPx: 32, placeholderType: 'ROAD_TILE' },
] as const;

export const GROUND_TILE_IMAGE_URLS: Readonly<Record<GroundTileId, string>> = {
  ground_grass: `${GROUND_TILE_PUBLIC_BASE}/ground_grass.png`,
  ground_plaza: `${GROUND_TILE_PUBLIC_BASE}/ground_plaza.png`,
  ground_road: `${GROUND_TILE_PUBLIC_BASE}/ground_road.png`,
};

export const PLACEHOLDER_TYPE_TO_GROUND_TILE: Readonly<Record<string, GroundTileId>> = {
  GRASS: 'ground_grass',
  PLAZA: 'ground_plaza',
  ROAD_TILE: 'ground_road',
};
