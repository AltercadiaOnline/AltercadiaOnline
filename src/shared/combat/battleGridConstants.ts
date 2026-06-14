/** Dimensões do grid tático na tela de batalha (Fire Emblem). */
export const BATTLE_GRID_COLS = 8;
export const BATTLE_GRID_ROWS = 6;

export type GridCell = {
  readonly x: number;
  readonly y: number;
};

export type BattleUnitPlacement = {
  readonly player: GridCell;
  readonly enemy: GridCell;
};

export const DEFAULT_BATTLE_PLACEMENT: BattleUnitPlacement = {
  player: { x: 2, y: 3 },
  enemy: { x: 3, y: 3 },
};
