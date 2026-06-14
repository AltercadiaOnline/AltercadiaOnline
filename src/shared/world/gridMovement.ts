import { TILE_SIZE } from './mapConstants.js';
import { canPlayerStepTo, type WorldPosition } from './movement.js';
import type { CardinalInput } from './movementInput.js';
import { composeKeyboardGridStep } from './worldMovementAxis.js';
import { tileCenterToWorldPixel, worldPixelToTile } from './portals.js';

/** Ritmo Tibia — duração base de um passo na grade (ms). */
export const GRID_STEP_MS = 300;

/** Passo quando sobrecarregado (CAP): 3× mais lento que o normal. */
export const ENCUMBERED_STEP_MS = 900;

export const ENCUMBERED_STEP_MULTIPLIER = ENCUMBERED_STEP_MS / GRID_STEP_MS;

export type GridStep = {
  readonly stepX: -1 | 0 | 1;
  readonly stepY: -1 | 0 | 1;
};

export type GridTileCoord = {
  readonly tileX: number;
  readonly tileY: number;
};

export function tileKey(tile: GridTileCoord): string {
  return `${tile.tileX},${tile.tileY}`;
}

/** Converte input WASD/Numpad em passo discreto de 1 tile (inclui diagonal). */
export function composeGridStep(input: CardinalInput): GridStep | null {
  return composeKeyboardGridStep(input);
}

export function snapWorldToTileCenter(worldX: number, worldY: number): WorldPosition {
  const { tileX, tileY } = worldPixelToTile(worldX, worldY);
  return tileCenterToWorldPixel(tileX, tileY);
}

export function worldPositionToTile(position: WorldPosition): GridTileCoord {
  return worldPixelToTile(position.x, position.y);
}

export function tilesEqual(a: GridTileCoord, b: GridTileCoord): boolean {
  return a.tileX === b.tileX && a.tileY === b.tileY;
}

export function gridStepBetween(from: GridTileCoord, to: GridTileCoord): GridStep | null {
  const stepX = Math.sign(to.tileX - from.tileX);
  const stepY = Math.sign(to.tileY - from.tileY);
  if (stepX === 0 && stepY === 0) return null;
  if (Math.abs(to.tileX - from.tileX) > 1 || Math.abs(to.tileY - from.tileY) > 1) {
    return null;
  }
  return { stepX: stepX as -1 | 0 | 1, stepY: stepY as -1 | 0 | 1 };
}

/** Um passo cardinal/diagonal em direção ao tile alvo (pathfinding). */
export function stepTowardTile(from: GridTileCoord, to: GridTileCoord): GridStep | null {
  const dx = to.tileX - from.tileX;
  const dy = to.tileY - from.tileY;
  if (dx === 0 && dy === 0) return null;
  return {
    stepX: Math.sign(dx) as -1 | 0 | 1,
    stepY: Math.sign(dy) as -1 | 0 | 1,
  };
}

/**
 * Tenta avançar exatamente 1 SQM na grade.
 * Diagonal valida os dois cardinais adjacentes (sem corner cutting).
 */
export function tryGridStep(
  from: WorldPosition,
  step: GridStep,
  mapData: number[][],
): WorldPosition | null {
  if (step.stepX === 0 && step.stepY === 0) return null;

  const fromSnapped = snapWorldToTileCenter(from.x, from.y);
  const fromTile = worldPixelToTile(fromSnapped.x, fromSnapped.y);
  const toTile = {
    tileX: fromTile.tileX + step.stepX,
    tileY: fromTile.tileY + step.stepY,
  };

  if (toTile.tileX < 0 || toTile.tileY < 0) return null;
  if (toTile.tileY >= mapData.length) return null;
  if (toTile.tileX >= (mapData[0]?.length ?? 0)) return null;

  const to = tileCenterToWorldPixel(toTile.tileX, toTile.tileY);
  if (!canPlayerStepTo(mapData, fromSnapped, to)) return null;
  return to;
}

/** Progresso linear do slide entre dois centros de tile (0–1). */
export function interpolateGridSlide(
  from: WorldPosition,
  to: WorldPosition,
  progress: number,
): WorldPosition {
  const t = Math.min(1, Math.max(0, progress));
  return {
    x: from.x + (to.x - from.x) * t,
    y: from.y + (to.y - from.y) * t,
  };
}

export function isOnTileCenter(position: WorldPosition, epsilon = 0.5): boolean {
  const center = snapWorldToTileCenter(position.x, position.y);
  return Math.hypot(center.x - position.x, center.y - position.y) <= epsilon;
}

/** Distância em tiles (para debug). */
export function tileManhattanDistance(a: GridTileCoord, b: GridTileCoord): number {
  return Math.abs(a.tileX - b.tileX) + Math.abs(a.tileY - b.tileY);
}

/** Trava coordenadas ao centro exato do tile (evita ficar entre SQMs). */
export function lockWorldToGrid(worldX: number, worldY: number): WorldPosition {
  return snapWorldToTileCenter(Math.round(worldX), Math.round(worldY));
}
