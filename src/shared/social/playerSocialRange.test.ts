import { describe, expect, it } from 'vitest';
import { DESIGN_CONFIG } from '../../config/designConstants.js';
import {
  chebyshevTilesBetweenWorld,
  isWithinCasualDuelRange,
  isWithinPlayerInspectRange,
  isWithinPlayerTradeRange,
  PLAYER_INSPECT_MAX_RANGE_TILES,
  CASUAL_DUEL_MAX_RANGE_TILES,
  PLAYER_TRADE_MAX_RANGE_TILES,
} from './playerSocialRange.js';

const TILE = DESIGN_CONFIG.TILE.SIZE;

describe('playerSocialRange', () => {
  it('chebyshev usa tiles, não pixels', () => {
    expect(chebyshevTilesBetweenWorld(0, 0, TILE * 3, 0)).toBe(3);
    expect(chebyshevTilesBetweenWorld(0, 0, TILE * 3, TILE * 3)).toBe(3);
  });

  it('inspect cabe no viewport e recusa AOI longe', () => {
    expect(isWithinPlayerInspectRange(0, 0, TILE * PLAYER_INSPECT_MAX_RANGE_TILES, 0)).toBe(true);
    expect(isWithinPlayerInspectRange(0, 0, TILE * (PLAYER_INSPECT_MAX_RANGE_TILES + 1), 0)).toBe(false);
  });

  it('duelo casual aceita 6 tiles; trade permanece 3', () => {
    expect(CASUAL_DUEL_MAX_RANGE_TILES).toBe(6);
    expect(PLAYER_TRADE_MAX_RANGE_TILES).toBe(3);
    expect(isWithinCasualDuelRange(0, 0, TILE * CASUAL_DUEL_MAX_RANGE_TILES, 0)).toBe(true);
    expect(isWithinCasualDuelRange(0, 0, TILE * (CASUAL_DUEL_MAX_RANGE_TILES + 1), 0)).toBe(false);
    expect(isWithinPlayerTradeRange(0, 0, TILE * PLAYER_TRADE_MAX_RANGE_TILES, 0)).toBe(true);
    expect(isWithinPlayerTradeRange(0, 0, TILE * (PLAYER_TRADE_MAX_RANGE_TILES + 1), 0)).toBe(false);
  });
});
