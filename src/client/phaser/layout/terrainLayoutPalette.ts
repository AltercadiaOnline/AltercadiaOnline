import type { PlaceholderTypeId } from '../../world/placeholderRenderer.js';
import { PlaceholderType } from '../../world/placeholderRenderer.js';

/** Tipos semânticos de terreno para layout base (placeholders coloridos). */
export const TerrainLayoutKind = {
  STREET: 'street',
  PLAZA: 'plaza',
  GRASS: 'grass',
  WATER: 'water',
  COMMERCIAL: 'commercial',
  BUILDING_PAD: 'building_pad',
  ARENA: 'arena',
  TOWER: 'tower',
} as const;

export type TerrainLayoutKind =
  (typeof TerrainLayoutKind)[keyof typeof TerrainLayoutKind];

export type TerrainLayoutStyle = {
  readonly fill: number;
  readonly stroke: number;
  readonly alpha: number;
};

/** Paleta de layout — Game Designer troca cores aqui antes dos PNGs finais. */
export const TERRAIN_LAYOUT_PALETTE: Record<TerrainLayoutKind, TerrainLayoutStyle> = {
  [TerrainLayoutKind.STREET]: { fill: 0x2c2c2c, stroke: 0x4a4a4a, alpha: 0.95 },
  [TerrainLayoutKind.PLAZA]: { fill: 0x355a38, stroke: 0x4a7a50, alpha: 0.95 },
  [TerrainLayoutKind.GRASS]: { fill: 0x2a4a32, stroke: 0x3d6644, alpha: 0.95 },
  [TerrainLayoutKind.WATER]: { fill: 0x1a4a6e, stroke: 0x3a8ab8, alpha: 0.9 },
  [TerrainLayoutKind.COMMERCIAL]: { fill: 0x4a3a28, stroke: 0xc9a227, alpha: 0.85 },
  [TerrainLayoutKind.BUILDING_PAD]: { fill: 0x4a4a4a, stroke: 0x6a6a6a, alpha: 0.9 },
  [TerrainLayoutKind.ARENA]: { fill: 0x5c4632, stroke: 0xc9a227, alpha: 0.9 },
  [TerrainLayoutKind.TOWER]: { fill: 0x2e3648, stroke: 0x8eb4ff, alpha: 0.9 },
};

/** Mapeia placeholder do ExplorationScene → tipo visual de layout. */
export function resolveTerrainLayoutKind(placeholderType: PlaceholderTypeId): TerrainLayoutKind {
  switch (placeholderType) {
    case PlaceholderType.ROAD_TILE:
      return TerrainLayoutKind.STREET;
    case PlaceholderType.PLAZA:
      return TerrainLayoutKind.PLAZA;
    case PlaceholderType.GRASS:
      return TerrainLayoutKind.GRASS;
    case PlaceholderType.BUILDING:
    case PlaceholderType.TOWER_BUILDING:
    case PlaceholderType.URBAN_PROP:
      return TerrainLayoutKind.BUILDING_PAD;
    case PlaceholderType.INTERACTIVE_OBJ:
      return TerrainLayoutKind.COMMERCIAL;
    case PlaceholderType.ARENA:
    case PlaceholderType.ARENA_FLOOR:
    case PlaceholderType.ARENA_STEP:
    case PlaceholderType.SPECTATOR_RING:
      return TerrainLayoutKind.ARENA;
    case PlaceholderType.TOWER_FLOOR:
    case PlaceholderType.TOWER_STEP:
      return TerrainLayoutKind.TOWER;
    case PlaceholderType.NPC_SPOT:
      return TerrainLayoutKind.COMMERCIAL;
    default:
      return TerrainLayoutKind.GRASS;
  }
}

export function getTerrainLayoutStyle(kind: TerrainLayoutKind): TerrainLayoutStyle {
  return TERRAIN_LAYOUT_PALETTE[kind];
}
