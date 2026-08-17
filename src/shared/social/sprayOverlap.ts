import { DESIGN_CONFIG } from '../../config/designConstants.js';

/** Sobreposição máxima permitida entre dois pixos (área / área do stencil). */
export const SPRAY_MAX_OVERLAP_RATIO = 0.3;

/**
 * Lado do AABB do pixo em px — 40px em tile 32px ≈ 20% de overlap no vizinho
 * ortogonal (abaixo do teto de 30%) e 100% no mesmo tile.
 */
export const SPRAY_FOOTPRINT_PX = 40;

export const SPRAY_TOO_CLOSE_MESSAGE =
  'Este pixo está muito próximo de outro pixo de jogador.';

export type SprayFootprintRect = {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
};

export type SprayTileAnchor = {
  readonly tileX: number;
  readonly tileY: number;
};

/** Centro dos pés no tile — igual ao overlay Construct. */
export function sprayFeetWorldPx(
  tileX: number,
  tileY: number,
  tileSize: number = DESIGN_CONFIG.TILE.SIZE,
): { readonly x: number; readonly y: number } {
  return {
    x: tileX * tileSize + tileSize / 2,
    y: tileY * tileSize + tileSize,
  };
}

export function sprayFootprintRect(
  tileX: number,
  tileY: number,
  tileSize: number = DESIGN_CONFIG.TILE.SIZE,
  footprintPx: number = SPRAY_FOOTPRINT_PX,
): SprayFootprintRect {
  const feet = sprayFeetWorldPx(tileX, tileY, tileSize);
  const half = footprintPx / 2;
  return {
    left: feet.x - half,
    top: feet.y - footprintPx,
    right: feet.x + half,
    bottom: feet.y,
  };
}

function axisOverlap(a0: number, a1: number, b0: number, b1: number): number {
  return Math.max(0, Math.min(a1, b1) - Math.max(a0, b0));
}

export function sprayOverlapArea(a: SprayFootprintRect, b: SprayFootprintRect): number {
  const width = axisOverlap(a.left, a.right, b.left, b.right);
  const height = axisOverlap(a.top, a.bottom, b.top, b.bottom);
  return width * height;
}

export function sprayOverlapRatio(
  a: SprayFootprintRect,
  b: SprayFootprintRect,
): number {
  const areaA = Math.max(1, (a.right - a.left) * (a.bottom - a.top));
  const areaB = Math.max(1, (b.right - b.left) * (b.bottom - b.top));
  return sprayOverlapArea(a, b) / Math.min(areaA, areaB);
}

export function pointHitsSprayFootprint(
  worldX: number,
  worldY: number,
  tileX: number,
  tileY: number,
  tileSize?: number,
): boolean {
  const rect = sprayFootprintRect(tileX, tileY, tileSize);
  return worldX >= rect.left && worldX <= rect.right && worldY >= rect.top && worldY <= rect.bottom;
}

/** Clique no pixo: footprint de colocação + AABB visual (~64px no chão). */
export const SPRAY_PICK_FOOTPRINT_PX = 64;

export function pointHitsSprayPick(
  worldX: number,
  worldY: number,
  tileX: number,
  tileY: number,
  tileSize?: number,
): boolean {
  if (pointHitsSprayFootprint(worldX, worldY, tileX, tileY, tileSize)) return true;
  const feet = sprayFeetWorldPx(tileX, tileY, tileSize);
  const half = SPRAY_PICK_FOOTPRINT_PX / 2;
  return worldX >= feet.x - half
    && worldX <= feet.x + half
    && worldY >= feet.y - SPRAY_PICK_FOOTPRINT_PX
    && worldY <= feet.y;
}

/**
 * True se o candidato “come” mais de 30% de outro pixo, ou cai 100% em cima.
 * Ignora o próprio spray no mesmo tile (replace do autor).
 */
export function isSprayTooCloseToOthers(
  candidate: SprayTileAnchor,
  existing: readonly SprayTileAnchor[],
  options: {
    readonly ignoreSameTileAuthor?: boolean;
    readonly tileSize?: number;
    readonly maxOverlapRatio?: number;
  } = {},
): boolean {
  const tileSize = options.tileSize ?? DESIGN_CONFIG.TILE.SIZE;
  const maxRatio = options.maxOverlapRatio ?? SPRAY_MAX_OVERLAP_RATIO;
  const candidateRect = sprayFootprintRect(candidate.tileX, candidate.tileY, tileSize);

  for (const other of existing) {
    if (
      options.ignoreSameTileAuthor
      && other.tileX === candidate.tileX
      && other.tileY === candidate.tileY
    ) {
      continue;
    }
    const otherRect = sprayFootprintRect(other.tileX, other.tileY, tileSize);
    if (sprayOverlapRatio(candidateRect, otherRect) > maxRatio) {
      return true;
    }
  }
  return false;
}
