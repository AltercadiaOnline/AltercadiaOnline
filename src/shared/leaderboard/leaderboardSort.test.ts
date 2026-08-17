import { describe, expect, it } from 'vitest';
import type { LeaderboardStatRow } from './leaderboardTypes.js';
import { compareLeaderboardRows, rowQualifiesForBoard } from './leaderboardSort.js';

function row(overrides: Partial<LeaderboardStatRow> & Pick<LeaderboardStatRow, 'playerId'>): LeaderboardStatRow {
  return {
    characterId: 1,
    displayName: overrides.playerId,
    classId: 'IMPETUS',
    level: 1,
    xpCurrent: 0,
    levelReachedAt: 100,
    movesetXp: 0,
    movesetReachedAt: 100,
    pvpRating: 1000,
    pvpWins: 0,
    pvpLosses: 0,
    pvpMatches: 0,
    pvpRatingReachedAt: 100,
    pveDungeonClears: 0,
    pveBossKills: 0,
    pveKills: 0,
    pveScoreReachedAt: 100,
    updatedAt: 100,
    ...overrides,
  };
}

describe('leaderboardSort', () => {
  it('no mesmo nível a barra de XP desempata; o relógio só no empate total', () => {
    const highBar = row({ playerId: 'a', level: 10, xpCurrent: 80, levelReachedAt: 500 });
    const lowBar = row({ playerId: 'b', level: 10, xpCurrent: 20, levelReachedAt: 10 });
    expect(compareLeaderboardRows('level_global', highBar, lowBar)).toBeLessThan(0);

    const first = row({ playerId: 'a', level: 10, xpCurrent: 50, levelReachedAt: 10 });
    const later = row({ playerId: 'b', level: 10, xpCurrent: 50, levelReachedAt: 90 });
    expect(compareLeaderboardRows('level_global', first, later)).toBeLessThan(0);
  });

  it('moveset ordena pela soma de XP de domínio', () => {
    const more = row({ playerId: 'a', movesetXp: 900 });
    const less = row({ playerId: 'b', movesetXp: 100 });
    expect(compareLeaderboardRows('moveset', more, less)).toBeLessThan(0);
  });

  it('PvP exige 10 partidas rankeadas', () => {
    const ready = row({ playerId: 'a', pvpMatches: 10 });
    const short = row({ playerId: 'b', pvpMatches: 9 });
    expect(rowQualifiesForBoard(ready, 'pvp_ranked', null)).toBe(true);
    expect(rowQualifiesForBoard(short, 'pvp_ranked', null)).toBe(false);
  });

  it('PvE ordena masmorra → chefe → kills', () => {
    const dungeon = row({ playerId: 'a', pveDungeonClears: 1, pveBossKills: 0, pveKills: 1 });
    const farmer = row({ playerId: 'b', pveDungeonClears: 0, pveBossKills: 9, pveKills: 999 });
    expect(compareLeaderboardRows('pve', dungeon, farmer)).toBeLessThan(0);
  });
});
