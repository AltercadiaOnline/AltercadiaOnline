import type { ClassType } from '../types/classes.js';
import {
  PVP_RANKED_LEADERBOARD_MIN_MATCHES,
  type LeaderboardBoardId,
  type LeaderboardPublicEntry,
  type LeaderboardStatRow,
} from './leaderboardTypes.js';

function cmpNumDesc(a: number, b: number): number {
  return b - a;
}

function cmpTimeAsc(a: number, b: number): number {
  return a - b;
}

function cmpIdAsc(a: LeaderboardStatRow, b: LeaderboardStatRow): number {
  const player = a.playerId.localeCompare(b.playerId);
  if (player !== 0) return player;
  return a.characterId - b.characterId;
}

function compareLevel(a: LeaderboardStatRow, b: LeaderboardStatRow): number {
  return cmpNumDesc(a.level, b.level)
    || cmpNumDesc(a.xpCurrent, b.xpCurrent)
    || cmpTimeAsc(a.levelReachedAt, b.levelReachedAt)
    || cmpIdAsc(a, b);
}

function compareMoveset(a: LeaderboardStatRow, b: LeaderboardStatRow): number {
  return cmpNumDesc(a.movesetXp, b.movesetXp)
    || cmpTimeAsc(a.movesetReachedAt, b.movesetReachedAt)
    || cmpIdAsc(a, b);
}

function comparePvp(a: LeaderboardStatRow, b: LeaderboardStatRow): number {
  return cmpNumDesc(a.pvpRating, b.pvpRating)
    || cmpNumDesc(a.pvpWins, b.pvpWins)
    || cmpTimeAsc(a.pvpRatingReachedAt, b.pvpRatingReachedAt)
    || cmpIdAsc(a, b);
}

function comparePve(a: LeaderboardStatRow, b: LeaderboardStatRow): number {
  return cmpNumDesc(a.pveDungeonClears, b.pveDungeonClears)
    || cmpNumDesc(a.pveBossKills, b.pveBossKills)
    || cmpNumDesc(a.pveKills, b.pveKills)
    || cmpTimeAsc(a.pveScoreReachedAt, b.pveScoreReachedAt)
    || cmpIdAsc(a, b);
}

export function rowQualifiesForBoard(
  row: LeaderboardStatRow,
  boardId: LeaderboardBoardId,
  classId: ClassType | null,
): boolean {
  if (boardId === 'level_class') {
    return classId !== null && row.classId === classId;
  }
  if (boardId === 'pvp_ranked') {
    return row.pvpMatches >= PVP_RANKED_LEADERBOARD_MIN_MATCHES;
  }
  return true;
}

export function compareLeaderboardRows(
  boardId: LeaderboardBoardId,
  a: LeaderboardStatRow,
  b: LeaderboardStatRow,
): number {
  switch (boardId) {
    case 'level_global':
    case 'level_class':
      return compareLevel(a, b);
    case 'moveset':
      return compareMoveset(a, b);
    case 'pvp_ranked':
      return comparePvp(a, b);
    case 'pve':
      return comparePve(a, b);
    default: {
      const _never: never = boardId;
      return _never;
    }
  }
}

export function formatLeaderboardScore(
  boardId: LeaderboardBoardId,
  row: LeaderboardStatRow,
): { readonly scoreLabel: string; readonly scoreValue: number } {
  switch (boardId) {
    case 'level_global':
    case 'level_class':
      return { scoreLabel: `Nv. ${row.level}`, scoreValue: row.level };
    case 'moveset':
      return {
        scoreLabel: row.movesetXp.toLocaleString('pt-BR'),
        scoreValue: row.movesetXp,
      };
    case 'pvp_ranked':
      return { scoreLabel: String(row.pvpRating), scoreValue: row.pvpRating };
    case 'pve':
      return {
        scoreLabel: `${row.pveDungeonClears}/${row.pveBossKills}/${row.pveKills}`,
        scoreValue: row.pveKills,
      };
    default: {
      const _never: never = boardId;
      return _never;
    }
  }
}

export function toPublicLeaderboardEntries(
  boardId: LeaderboardBoardId,
  rows: readonly LeaderboardStatRow[],
): LeaderboardPublicEntry[] {
  return rows.map((row, index) => {
    const score = formatLeaderboardScore(boardId, row);
    return {
      rank: index + 1,
      displayName: row.displayName,
      classId: row.classId,
      scoreLabel: score.scoreLabel,
      scoreValue: score.scoreValue,
    };
  });
}

export function leaderboardTitle(boardId: LeaderboardBoardId, classId: ClassType | null): string {
  switch (boardId) {
    case 'level_global':
      return 'Top Level';
    case 'level_class':
      return classId ? `Top Level ${classId}` : 'Top Level Classe';
    case 'moveset':
      return 'Top Moveset';
    case 'pvp_ranked':
      return 'Top PvP Rankeado';
    case 'pve':
      return 'Top PvE';
    default: {
      const _never: never = boardId;
      return _never;
    }
  }
}

export function leaderboardScoreHeader(boardId: LeaderboardBoardId): string {
  switch (boardId) {
    case 'level_global':
    case 'level_class':
      return 'Nível';
    case 'moveset':
      return 'Domínio';
    case 'pvp_ranked':
      return 'Rating';
    case 'pve':
      return 'M/C/K';
    default: {
      const _never: never = boardId;
      return _never;
    }
  }
}
