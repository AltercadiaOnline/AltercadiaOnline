import { worldPixelToTile } from '../world/portals.js';

/** Viewport 640×360 ≈ 20×11 tiles; folga para o inspect (não a AOI de 32). */
export const PLAYER_INSPECT_MAX_RANGE_TILES = 16;

/** Convite / aceite de duelo casual — perto o bastante para “estar na briga”. */
export const CASUAL_DUEL_MAX_RANGE_TILES = 6;

export const CASUAL_DUEL_COUNTDOWN_MS = 5_000;

export const CASUAL_DUEL_PENDING_TIMEOUT_MS = 25_000;

/** Mesa presencial — face a face (independente do alcance do duelo). */
export const PLAYER_TRADE_MAX_RANGE_TILES = 3;

export const PLAYER_TRADE_PENDING_TIMEOUT_MS = 25_000;

export function chebyshevTilesBetweenWorld(
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  const a = worldPixelToTile(ax, ay);
  const b = worldPixelToTile(bx, by);
  return Math.max(Math.abs(a.tileX - b.tileX), Math.abs(a.tileY - b.tileY));
}

export function isWithinPlayerInspectRange(
  ax: number,
  ay: number,
  bx: number,
  by: number,
): boolean {
  return chebyshevTilesBetweenWorld(ax, ay, bx, by) <= PLAYER_INSPECT_MAX_RANGE_TILES;
}

export function isWithinCasualDuelRange(
  ax: number,
  ay: number,
  bx: number,
  by: number,
): boolean {
  return chebyshevTilesBetweenWorld(ax, ay, bx, by) <= CASUAL_DUEL_MAX_RANGE_TILES;
}

export function isWithinPlayerTradeRange(
  ax: number,
  ay: number,
  bx: number,
  by: number,
): boolean {
  return chebyshevTilesBetweenWorld(ax, ay, bx, by) <= PLAYER_TRADE_MAX_RANGE_TILES;
}
