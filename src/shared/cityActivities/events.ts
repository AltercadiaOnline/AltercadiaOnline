import type { LastTournamentBoardSnapshot } from './cityActivitiesConfig.js';

/** Eventos de atividades da cidade — consumidos via EventBus (nunca acoplados ao Combat). */
export const CityActivityEventType = {
  BetDuelChallengeSent: 'CITY_BET_DUEL_CHALLENGE_SENT',
  BetDuelAccepted: 'CITY_BET_DUEL_ACCEPTED',
  BetDuelSettled: 'CITY_BET_DUEL_SETTLED',
  TournamentRegistrationOpen: 'CITY_TOURNAMENT_REGISTRATION_OPEN',
  TournamentPlayerEliminated: 'CITY_TOURNAMENT_PLAYER_ELIMINATED',
  TournamentFinished: 'CITY_TOURNAMENT_FINISHED',
  TournamentBoardUpdated: 'CITY_TOURNAMENT_BOARD_UPDATED',
} as const;

export type CityActivityEventTypeId =
  (typeof CityActivityEventType)[keyof typeof CityActivityEventType];

export type BetDuelSettledPayload = {
  readonly duelId: string;
  readonly winnerPlayerId: string;
  readonly loserPlayerId: string;
  readonly potAmount: number;
};

export type CityActivityEvent =
  | {
      readonly type: typeof CityActivityEventType.BetDuelSettled;
      readonly payload: BetDuelSettledPayload;
    }
  | {
      readonly type: typeof CityActivityEventType.TournamentBoardUpdated;
      readonly payload: LastTournamentBoardSnapshot;
    }
  | {
      readonly type: typeof CityActivityEventType.TournamentFinished;
      readonly payload: {
        readonly tournamentId: string;
        readonly standings: readonly LastTournamentBoardSnapshot['standings'][number][];
      };
    };

export type CityActivityEventHandler = (event: CityActivityEvent) => void;
