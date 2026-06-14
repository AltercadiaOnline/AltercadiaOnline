import { resolveMoveCombatMeta } from './resolveMoveCombatMeta.js';
import {
  BATTLE_GRID_COLS,
  BATTLE_GRID_ROWS,
  type GridCell,
} from './battleGridConstants.js';

export const MoveTargetType = {
  Enemy: 'ENEMY',
  Self: 'SELF',
  Tile: 'TILE',
} as const;

export type MoveTargetType = (typeof MoveTargetType)[keyof typeof MoveTargetType];

export type TargetValidation =
  | { readonly ok: true; readonly target: GridCell }
  | { readonly ok: false; readonly reason: 'OUT_OF_RANGE' | 'INVALID_TARGET' | 'UNKNOWN_MOVE' };

const DEFAULT_RANGE = 1;
const DEFAULT_TARGET: MoveTargetType = MoveTargetType.Enemy;

export function getMoveRange(moveId: string): number {
  return resolveMoveCombatMeta(moveId)?.range ?? DEFAULT_RANGE;
}

export function getMoveTargetType(moveId: string): MoveTargetType {
  return resolveMoveCombatMeta(moveId)?.targetType ?? DEFAULT_TARGET;
}

export function manhattanDistance(a: GridCell, b: GridCell): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

export function isInsideGrid(cell: GridCell): boolean {
  return cell.x >= 0 && cell.x < BATTLE_GRID_COLS && cell.y >= 0 && cell.y < BATTLE_GRID_ROWS;
}

/** Células alcançáveis a partir da origem (distância Manhattan). */
export function getCellsInRange(origin: GridCell, range: number): GridCell[] {
  const cells: GridCell[] = [];
  for (let y = 0; y < BATTLE_GRID_ROWS; y += 1) {
    for (let x = 0; x < BATTLE_GRID_COLS; x += 1) {
      const cell = { x, y };
      if (manhattanDistance(origin, cell) <= range) {
        cells.push(cell);
      }
    }
  }
  return cells;
}

function cellKey(cell: GridCell): string {
  return `${cell.x},${cell.y}`;
}

export function getAttackableCells(
  moveId: string,
  origin: GridCell,
  enemyPos: GridCell,
  playerPos: GridCell,
): GridCell[] {
  if (!resolveMoveCombatMeta(moveId)) return [];

  const range = getMoveRange(moveId);
  const targetType = getMoveTargetType(moveId);
  const inRange = getCellsInRange(origin, range);

  switch (targetType) {
    case MoveTargetType.Self:
      return inRange.filter((c) => c.x === playerPos.x && c.y === playerPos.y);
    case MoveTargetType.Enemy:
      return inRange.filter((c) => c.x === enemyPos.x && c.y === enemyPos.y);
    case MoveTargetType.Tile:
      return inRange.filter((c) => !(c.x === enemyPos.x && c.y === enemyPos.y));
    default:
      return inRange;
  }
}

export function validateTargetClick(
  moveId: string,
  click: GridCell,
  playerPos: GridCell,
  enemyPos: GridCell,
): TargetValidation {
  if (!resolveMoveCombatMeta(moveId)) {
    return { ok: false, reason: 'UNKNOWN_MOVE' };
  }
  if (!isInsideGrid(click)) {
    return { ok: false, reason: 'INVALID_TARGET' };
  }

  const range = getMoveRange(moveId);
  const targetType = getMoveTargetType(moveId);
  const distance = manhattanDistance(playerPos, click);

  if (distance > range) {
    return { ok: false, reason: 'OUT_OF_RANGE' };
  }

  switch (targetType) {
    case MoveTargetType.Self:
      if (click.x !== playerPos.x || click.y !== playerPos.y) {
        return { ok: false, reason: 'INVALID_TARGET' };
      }
      break;
    case MoveTargetType.Enemy:
      if (click.x !== enemyPos.x || click.y !== enemyPos.y) {
        return { ok: false, reason: 'INVALID_TARGET' };
      }
      break;
    case MoveTargetType.Tile:
      if (click.x === enemyPos.x && click.y === enemyPos.y) {
        return { ok: false, reason: 'INVALID_TARGET' };
      }
      break;
    default:
      break;
  }

  return { ok: true, target: click };
}

export function buildRangeHighlightSets(
  moveId: string,
  playerPos: GridCell,
  enemyPos: GridCell,
): { readonly rangeCells: Set<string>; readonly attackCells: Set<string> } {
  const range = getMoveRange(moveId);
  const rangeCells = new Set(getCellsInRange(playerPos, range).map(cellKey));
  const attackCells = new Set(getAttackableCells(moveId, playerPos, enemyPos, playerPos).map(cellKey));
  return { rangeCells, attackCells };
}
