export const TournamentRankingPeriod = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
  ALL_TIME: 'all_time',
} as const;

export type TournamentRankingPeriod =
  (typeof TournamentRankingPeriod)[keyof typeof TournamentRankingPeriod];

export type TournamentRankingEntry = {
  readonly rank: number;
  readonly playerId: string;
  readonly displayName: string;
  readonly wins: number;
};

export type TournamentRankingBoard = {
  readonly period: TournamentRankingPeriod;
  readonly title: string;
  readonly entries: readonly TournamentRankingEntry[];
  readonly updatedAt: number;
};
