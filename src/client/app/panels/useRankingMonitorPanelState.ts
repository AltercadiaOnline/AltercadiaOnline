import { useLiveLeaderboard } from '../hooks/useLiveLeaderboard.js';
import type { WorldPanelContext } from '../store/worldPanelContext.js';

export type RankingMonitorView = {
  readonly objectId: string;
  readonly label: string;
};

/** Arena PC = só PvP ranqueado (cidade). Vitrine level/moveset/PvE fica no login. */
export const ARENA_RANKED_BOARD_ID = 'pvp_ranked' as const;

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
    objectId: 'computador_arena',
    label: 'Computador da Arena',
  };
}

export function useRankingMonitorPanelState(monitor: RankingMonitorView) {
  const { snapshot, loading } = useLiveLeaderboard(ARENA_RANKED_BOARD_ID, {
    limit: 10,
  });

  return {
    monitor,
    boardId: ARENA_RANKED_BOARD_ID,
    snapshot,
    loading,
  };
}
