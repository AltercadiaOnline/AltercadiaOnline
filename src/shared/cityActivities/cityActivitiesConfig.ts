/** Módulo Atividades da Cidade v1.0 — regras oficiais (MVP). */

export const CityActivityId = {
  BetDuel: 'BET_DUEL',
  WeeklyTournament: 'WEEKLY_TOURNAMENT',
} as const;

export type CityActivityIdValue = (typeof CityActivityId)[keyof typeof CityActivityId];

/** POI único na cidade — duelo e torneio compartilham o hub. */
export const CITY_ACTIVITIES_POI_ID = 'city_activities_hub';

export const BetDuelRules = {
  /** Vencedor leva 100% do pote apostado. */
  winnerTakesAll: true,
  affectsPh: false,
  affectsRanking: false,
} as const;

export const WeeklyTournamentRules = {
  maxPlayers: 32,
  prizeTopCount: 3,
  eliminationOnDefeat: true,
  affectsPh: false,
  affectsRanking: false,
  /** Frequência declarada no design — cron a implementar. */
  cadenceDays: 7,
} as const;

/** Features documentadas mas fora do MVP. */
export const PostMvpCityFeatures = {
  pveMissionBoard: 'PVE_MISSION_BOARD',
  playerCosmeticsMarketplace: 'PLAYER_COSMETICS_MARKETPLACE',
} as const;

export type TournamentStanding = {
  readonly rank: 1 | 2 | 3;
  readonly playerId: string;
  readonly displayName: string;
};

export type LastTournamentBoardSnapshot = {
  readonly tournamentId: string;
  readonly endedAtIso: string;
  readonly standings: readonly TournamentStanding[];
};
