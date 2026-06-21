import { useEffect, useMemo, useState } from 'react';
import { getTournamentRankingBoard } from '../../../shared/arena/tournamentRankingStore.js';
import {
  TournamentRankingPeriod,
  type TournamentRankingBoard,
} from '../../../shared/arena/tournamentRankingTypes.js';
import { getPlayerProfileStore } from '../../ui/character/playerProfileStore.js';
import type { WorldPanelContext } from '../store/worldPanelContext.js';

export type RankingMonitorView = {
  readonly objectId: string;
  readonly label: string;
};

export const RANKING_TAB_DEFS: ReadonlyArray<{
  readonly id: TournamentRankingPeriod;
  readonly label: string;
}> = [
  { id: TournamentRankingPeriod.DAILY, label: 'Diário' },
  { id: TournamentRankingPeriod.WEEKLY, label: 'Semanal' },
  { id: TournamentRankingPeriod.ALL_TIME, label: 'Geral' },
];

export function resolveRankingMonitorFromContext(
  context: WorldPanelContext,
): RankingMonitorView {
  if (context.kind === 'rankingMonitor') {
    return {
      objectId: context.objectId,
      label: context.label,
    };
  }
  return {
    objectId: 'arena_ranking_monitor',
    label: 'Monitor de Ranking',
  };
}

export function useRankingMonitorPanelState(monitor: RankingMonitorView) {
  const [period, setPeriod] = useState<TournamentRankingPeriod>(TournamentRankingPeriod.DAILY);
  const [displayName, setDisplayName] = useState(
    () => getPlayerProfileStore().getSnapshot().displayName,
  );

  useEffect(() => {
    return getPlayerProfileStore().subscribe((profile) => {
      setDisplayName(profile.displayName);
    });
  }, []);

  const board: TournamentRankingBoard = useMemo(
    () => getTournamentRankingBoard(period, displayName),
    [displayName, period],
  );

  return {
    monitor,
    period,
    board,
    selectPeriod: setPeriod,
  };
}
