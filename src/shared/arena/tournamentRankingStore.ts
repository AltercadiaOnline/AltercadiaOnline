import {
  TournamentRankingPeriod,
  type TournamentRankingBoard,
  type TournamentRankingEntry,
} from './tournamentRankingTypes.js';

const PERIOD_META: Record<
  TournamentRankingPeriod,
  { readonly title: string; readonly seed: readonly Omit<TournamentRankingEntry, 'rank'>[] }
> = {
  [TournamentRankingPeriod.DAILY]: {
    title: 'Ranking Diário',
    seed: [
      { playerId: 'p_kael', displayName: 'Kael Voss', wins: 7 },
      { playerId: 'p_mira', displayName: 'Mira Solano', wins: 6 },
      { playerId: 'p_nox', displayName: 'Nox Vega', wins: 5 },
      { playerId: 'p_local', displayName: 'Operative', wins: 4 },
      { playerId: 'p_lyn', displayName: 'Lyn Ash', wins: 3 },
      { playerId: 'p_dax', displayName: 'Dax Rho', wins: 2 },
      { playerId: 'p_ivy', displayName: 'Ivy Korr', wins: 1 },
    ],
  },
  [TournamentRankingPeriod.WEEKLY]: {
    title: 'Ranking Semanal',
    seed: [
      { playerId: 'p_mira', displayName: 'Mira Solano', wins: 28 },
      { playerId: 'p_kael', displayName: 'Kael Voss', wins: 24 },
      { playerId: 'p_nox', displayName: 'Nox Vega', wins: 19 },
      { playerId: 'p_local', displayName: 'Operative', wins: 15 },
      { playerId: 'p_lyn', displayName: 'Lyn Ash', wins: 12 },
      { playerId: 'p_dax', displayName: 'Dax Rho', wins: 9 },
      { playerId: 'p_ivy', displayName: 'Ivy Korr', wins: 6 },
      { playerId: 'p_zed', displayName: 'Zed Quinn', wins: 4 },
    ],
  },
  [TournamentRankingPeriod.ALL_TIME]: {
    title: 'Ranking Geral',
    seed: [
      { playerId: 'p_kael', displayName: 'Kael Voss', wins: 142 },
      { playerId: 'p_mira', displayName: 'Mira Solano', wins: 128 },
      { playerId: 'p_nox', displayName: 'Nox Vega', wins: 97 },
      { playerId: 'p_lyn', displayName: 'Lyn Ash', wins: 81 },
      { playerId: 'p_local', displayName: 'Operative', wins: 64 },
      { playerId: 'p_dax', displayName: 'Dax Rho', wins: 52 },
      { playerId: 'p_ivy', displayName: 'Ivy Korr', wins: 41 },
      { playerId: 'p_zed', displayName: 'Zed Quinn', wins: 33 },
      { playerId: 'p_rin', displayName: 'Rin Cole', wins: 27 },
      { playerId: 'p_ash', displayName: 'Ash Morrow', wins: 19 },
    ],
  },
};

function withRanks(
  rows: readonly Omit<TournamentRankingEntry, 'rank'>[],
): TournamentRankingEntry[] {
  return rows.map((row, index) => ({ ...row, rank: index + 1 }));
}

/** Retorna ranking do torneio — substituível por feed autoritativo do servidor. */
export function getTournamentRankingBoard(
  period: TournamentRankingPeriod,
  currentDisplayName?: string,
): TournamentRankingBoard {
  const meta = PERIOD_META[period];
  let entries = withRanks(meta.seed);

  if (currentDisplayName) {
    entries = entries.map((entry) =>
      entry.displayName === currentDisplayName || entry.playerId === 'p_local'
        ? { ...entry, displayName: currentDisplayName }
        : entry,
    );
  }

  return {
    period,
    title: meta.title,
    entries,
    updatedAt: Date.now(),
  };
}
