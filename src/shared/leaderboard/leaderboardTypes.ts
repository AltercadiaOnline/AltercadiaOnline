import type { ClassType } from '../types/classes.js';

export const LEADERBOARD_BOARD_IDS = [
  'level_global',
  'level_class',
  'moveset',
  'pvp_ranked',
  'pve',
] as const;

export type LeaderboardBoardId = (typeof LEADERBOARD_BOARD_IDS)[number];

/** Mínimo de duelos rankeados de arena para aparecer no board PvP. */
export const PVP_RANKED_LEADERBOARD_MIN_MATCHES = 10;

export const LEADERBOARD_DEFAULT_LIMIT = 10;
export const LEADERBOARD_MAX_LIMIT = 50;
export const LEADERBOARD_LOGIN_LIMIT = 5;

export type LeaderboardStatRow = {
  readonly playerId: string;
  readonly characterId: number;
  readonly displayName: string;
  readonly classId: ClassType | null;
  readonly level: number;
  readonly xpCurrent: number;
  readonly levelReachedAt: number;
  readonly movesetXp: number;
  readonly movesetReachedAt: number;
  readonly pvpRating: number;
  readonly pvpWins: number;
  readonly pvpLosses: number;
  readonly pvpMatches: number;
  readonly pvpRatingReachedAt: number;
  readonly pveDungeonClears: number;
  readonly pveBossKills: number;
  readonly pveKills: number;
  readonly pveScoreReachedAt: number;
  readonly updatedAt: number;
};

export type LeaderboardPublicEntry = {
  readonly rank: number;
  readonly displayName: string;
  readonly classId: ClassType | null;
  readonly scoreLabel: string;
  readonly scoreValue: number;
};

export type LeaderboardSnapshot = {
  readonly boardId: LeaderboardBoardId;
  readonly classId: ClassType | null;
  readonly title: string;
  readonly scoreHeader: string;
  readonly entries: readonly LeaderboardPublicEntry[];
  readonly updatedAt: number;
  readonly live: true;
};

export function isLeaderboardBoardId(value: unknown): value is LeaderboardBoardId {
  return typeof value === 'string'
    && (LEADERBOARD_BOARD_IDS as readonly string[]).includes(value);
}
