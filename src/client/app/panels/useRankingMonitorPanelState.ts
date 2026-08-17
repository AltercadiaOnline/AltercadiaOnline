import { useState } from 'react';
import type { ClassType } from '../../../shared/types/classes.js';
import { CLASS_CATALOG } from '../../../shared/types/classes.js';
import type { LeaderboardBoardId } from '../../../shared/leaderboard/leaderboardTypes.js';
import { useLiveLeaderboard } from '../hooks/useLiveLeaderboard.js';
import type { WorldPanelContext } from '../store/worldPanelContext.js';

export type RankingMonitorView = {
  readonly objectId: string;
  readonly label: string;
};

export const RANKING_TAB_DEFS: ReadonlyArray<{
  readonly id: LeaderboardBoardId;
  readonly label: string;
}> = [
  { id: 'level_global', label: 'Level' },
  { id: 'level_class', label: 'Classe' },
  { id: 'moveset', label: 'Moveset' },
  { id: 'pvp_ranked', label: 'PvP' },
  { id: 'pve', label: 'PvE' },
];

const CLASS_TAB_IDS = Object.keys(CLASS_CATALOG) as ClassType[];

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
  const [boardId, setBoardId] = useState<LeaderboardBoardId>('pvp_ranked');
  const [classId, setClassId] = useState<ClassType>('IMPETUS');
  const { snapshot, loading } = useLiveLeaderboard(boardId, {
    ...(boardId === 'level_class' ? { classId } : {}),
    limit: 10,
  });

  return {
    monitor,
    boardId,
    classId,
    classIds: CLASS_TAB_IDS,
    snapshot,
    loading,
    selectBoard: setBoardId,
    selectClass: setClassId,
  };
}
