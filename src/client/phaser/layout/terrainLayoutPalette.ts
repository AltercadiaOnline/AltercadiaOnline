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

/** Paleta cyberpunk — base de cidade (referência planta baixa). */
export const TERRAIN_LAYOUT_PALETTE: Record<TerrainLayoutKind, TerrainLayoutStyle> = {
  [TerrainLayoutKind.STREET]: { fill: 0x1a1c22, stroke: 0x2ee8d0, alpha: 0.98 },
  [TerrainLayoutKind.PLAZA]: { fill: 0x22242c, stroke: 0x1a9e8c, alpha: 0.98 },
  [TerrainLayoutKind.GRASS]: { fill: 0x1e2830, stroke: 0x5a2d82, alpha: 0.95 },
  [TerrainLayoutKind.WATER]: { fill: 0x1a3048, stroke: 0x2ee8d0, alpha: 0.9 },
  [TerrainLayoutKind.COMMERCIAL]: { fill: 0x2a2420, stroke: 0xff8c42, alpha: 0.9 },
  [TerrainLayoutKind.BUILDING_PAD]: { fill: 0x161820, stroke: 0x4a5060, alpha: 0.92 },
  [TerrainLayoutKind.ARENA]: { fill: 0x2a1f18, stroke: 0xff8c42, alpha: 0.95 },
  [TerrainLayoutKind.TOWER]: { fill: 0x1e2438, stroke: 0x2ee8d0, alpha: 0.92 },
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
    case PlaceholderType.SPECTATOR_RING:
      return TerrainLayoutKind.ARENA;
    case PlaceholderType.ARENA_STEP:
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
