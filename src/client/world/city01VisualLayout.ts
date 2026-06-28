import {
  CITY_01_PORTALS,
  CITY_01_TILES_HIGH,
  CITY_01_TILES_WIDE,
} from '../../shared/world/maps/city01.js';
import {
  CITY_01_COMMERCE_ZONE,
  CITY_01_ARENA_CORE,
  CITY_01_RESIDENTIAL_ZONE,
  CITY_01_COMMERCE_SPINE,
  CITY_01_RESIDENTIAL_SPINE,
  CITY_01_PLAZA_MAX,
  CITY_01_PLAZA_MIN,
  CITY_01_ROAD_NORTH_Y,
  CITY_01_ROAD_SOUTH_Y,
  CITY_01_ROAD_X_MAX,
  CITY_01_ROAD_X_MIN,
  CITY_01_ROAD_Y_MAX,
  CITY_01_ROAD_Y_MIN,
  CITY_01_REFRACTION_BOOTH_ROAD_EW,
  CITY_01_REFRACTION_BOOTH_ROAD_NS,
  CITY_01_STRUCTURE_DEFS,
  type City01StructureDef,
} from '../../shared/world/maps/city01LayoutConstants.js';
import { DESIGN_CONFIG } from '../../config/designConstants.js';
import { portalCenterTile } from '../../shared/world/portals.js';

/** Tipos visuais — somente cliente; colisão permanece no mapa autoritativo. */
export const VisualTileKind = {
  Grass: 'grass',
  Road: 'road',
  Plaza: 'plaza',
  Building: 'building',
  Arena: 'arena',
  Cabana: 'cabana',
  Portal: 'portal',
} as const;

export type VisualTileKindId = (typeof VisualTileKind)[keyof typeof VisualTileKind];

export type VisualLandmarkKind = 'arena' | 'cabana' | 'exit' | 'portal' | 'structure';

export type VisualLandmark = {
  readonly id: string;
  readonly label: string;
  readonly kind: VisualLandmarkKind;
  readonly tileX: number;
  readonly tileY: number;
};

export type VisualCell = {
  readonly kind: VisualTileKindId;
  readonly landmarkId: string | null;
};

export type VisualStructure = City01StructureDef;

/** Protótipo ativo — exibe malha de ruas e contornos de zona no canvas. */
export const CITY01_SHOW_DEBUG_LAYOUT = true;

export const CITY01_VISUAL_PALETTE = {
  background: '#0a0b0f',
  grass: '#2a4a32',
  road: '#2c2c2c',
  plaza: '#355a38',
  building: '#1a1a2e',
  buildingEdge: '#252540',
  structureFill: '#1e2438',
  structureEdge: '#4a5578',
  structureLabel: '#e8ecf4',
  arena: '#4a3828',
  arenaGlow: '#c9a227',
  cabana: '#2a2848',
  cabanaRoof: '#3d3868',
  portal: '#00e8c8',
  portalGlow: 'rgba(0, 232, 200, 0.35)',
  gridLine: 'rgba(255,255,255,0.06)',
  debugRoad: 'rgba(255, 220, 80, 0.55)',
  debugZone: 'rgba(120, 200, 255, 0.35)',
} as const;

const ARENA_X = CITY_01_ARENA_CORE.tileX;
const ARENA_Y = CITY_01_ARENA_CORE.tileY;

export type City01VisualLayout = {
  readonly tiles: readonly (readonly VisualCell[])[];
  readonly landmarks: readonly VisualLandmark[];
  readonly structures: readonly VisualStructure[];
  readonly showDebugLayout: boolean;
  readonly mapTiles: number;
  readonly tileSize: number;
};

type MutableCellGrid = VisualCell[][];

function createGrassGrid(): MutableCellGrid {
  return Array.from({ length: CITY_01_TILES_HIGH }, () =>
    Array.from({ length: CITY_01_TILES_WIDE }, (): VisualCell => ({
      kind: VisualTileKind.Grass,
      landmarkId: null,
    })),
  );
}

function stampRect(
  tiles: MutableCellGrid,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  kind: VisualTileKindId,
): void {
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      if (x < 0 || y < 0 || x >= CITY_01_TILES_WIDE || y >= CITY_01_TILES_HIGH) continue;
      const row = tiles[y];
      if (!row) continue;
      row[x] = { kind, landmarkId: row[x]?.landmarkId ?? null };
    }
  }
}

/**
 * Malha de circulação — 5 tiles de largura.
 * Sul → Praça (Arena) → Norte (Beco dos Fundos) + ramificações Oeste/Leste.
 */
export function drawRoads(tiles: MutableCellGrid): void {
  stampRect(
    tiles,
    CITY_01_ROAD_X_MIN,
    CITY_01_ROAD_NORTH_Y,
    CITY_01_ROAD_X_MAX,
    CITY_01_ROAD_SOUTH_Y,
    VisualTileKind.Road,
  );

  const branchWest = CITY_01_RESIDENTIAL_ZONE.tileX;
  const branchEast = CITY_01_COMMERCE_ZONE.tileX + CITY_01_COMMERCE_ZONE.tileW - 1;
  stampRect(
    tiles,
    branchWest,
    CITY_01_ROAD_Y_MIN,
    branchEast,
    CITY_01_ROAD_Y_MAX,
    VisualTileKind.Road,
  );

  stampRect(
    tiles,
    CITY_01_RESIDENTIAL_SPINE.tileX,
    CITY_01_RESIDENTIAL_SPINE.tileY,
    CITY_01_RESIDENTIAL_SPINE.tileX + CITY_01_RESIDENTIAL_SPINE.tileW - 1,
    CITY_01_RESIDENTIAL_SPINE.tileY + CITY_01_RESIDENTIAL_SPINE.tileH - 1,
    VisualTileKind.Road,
  );

  stampRect(
    tiles,
    CITY_01_COMMERCE_SPINE.tileX,
    CITY_01_COMMERCE_SPINE.tileY,
    CITY_01_COMMERCE_SPINE.tileX + CITY_01_COMMERCE_SPINE.tileW - 1,
    CITY_01_COMMERCE_SPINE.tileY + CITY_01_COMMERCE_SPINE.tileH - 1,
    VisualTileKind.Road,
  );

  stampRect(
    tiles,
    CITY_01_REFRACTION_BOOTH_ROAD_EW.tileX,
    CITY_01_REFRACTION_BOOTH_ROAD_EW.tileY,
    CITY_01_REFRACTION_BOOTH_ROAD_EW.tileX + CITY_01_REFRACTION_BOOTH_ROAD_EW.tileW - 1,
    CITY_01_REFRACTION_BOOTH_ROAD_EW.tileY + CITY_01_REFRACTION_BOOTH_ROAD_EW.tileH - 1,
    VisualTileKind.Road,
  );

  stampRect(
    tiles,
    CITY_01_REFRACTION_BOOTH_ROAD_NS.tileX,
    CITY_01_REFRACTION_BOOTH_ROAD_NS.tileY,
    CITY_01_REFRACTION_BOOTH_ROAD_NS.tileX + CITY_01_REFRACTION_BOOTH_ROAD_NS.tileW - 1,
    CITY_01_REFRACTION_BOOTH_ROAD_NS.tileY + CITY_01_REFRACTION_BOOTH_ROAD_NS.tileH - 1,
    VisualTileKind.Road,
  );
}

function drawPlaza(tiles: MutableCellGrid): void {
  for (let y = CITY_01_PLAZA_MIN; y <= CITY_01_PLAZA_MAX; y++) {
    for (let x = CITY_01_PLAZA_MIN; x <= CITY_01_PLAZA_MAX; x++) {
      const row = tiles[y];
      if (!row) continue;
      const cell = row[x];
      if (!cell) continue;
      if (cell.kind === VisualTileKind.Road) continue;
      row[x] = { kind: VisualTileKind.Plaza, landmarkId: cell.landmarkId };
    }
  }
}

function stampStructures(landmarkById: Map<string, VisualLandmark>): void {
  for (const structure of CITY_01_STRUCTURE_DEFS) {
    landmarkById.set(structure.id, {
      id: structure.id,
      label: structure.label,
      kind: 'structure',
      tileX: structure.tileX + Math.floor(structure.tileW / 2),
      tileY: structure.tileY + Math.floor(structure.tileH / 2),
    });
  }
}

function stampArenaAndPortals(
  tiles: MutableCellGrid,
  landmarkById: Map<string, VisualLandmark>,
): void {
  const arenaRow = tiles[ARENA_Y];
  if (arenaRow?.[ARENA_X]) {
    arenaRow[ARENA_X] = { kind: VisualTileKind.Arena, landmarkId: 'arena' };
    landmarkById.set('arena', {
      id: 'arena',
      label: 'Arena',
      kind: 'arena',
      tileX: ARENA_X,
      tileY: ARENA_Y,
    });
  }

  for (const portal of CITY_01_PORTALS) {
    const center = portalCenterTile(portal);
    landmarkById.set(portal.id, {
      id: portal.id,
      label: portal.label,
      kind: 'portal',
      tileX: center.x,
      tileY: center.y,
    });
  }
}

/** Grade 40×40 @ 32px — malha de ruas, praça, placeholders e portal norte. */
export function buildCity01VisualLayout(): City01VisualLayout {
  const tiles = createGrassGrid();

  drawRoads(tiles);
  drawPlaza(tiles);

  const landmarkById = new Map<string, VisualLandmark>();
  stampStructures(landmarkById);
  stampArenaAndPortals(tiles, landmarkById);

  return {
    tiles,
    landmarks: [...landmarkById.values()],
    structures: [...CITY_01_STRUCTURE_DEFS],
    showDebugLayout: CITY01_SHOW_DEBUG_LAYOUT,
    mapTiles: CITY_01_TILES_WIDE,
    tileSize: DESIGN_CONFIG.TILE.SIZE,
  };
}

export function tileToWorldPixel(tileX: number, tileY: number, tileSize: number = DESIGN_CONFIG.TILE.SIZE): {
  x: number;
  y: number;
} {
  return { x: tileX * tileSize, y: tileY * tileSize };
}
