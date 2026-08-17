import { useEffect, useState } from 'react';
import type { ClassType } from '../../../shared/types/classes.js';
import type { LeaderboardBoardId, LeaderboardSnapshot } from '../../../shared/leaderboard/leaderboardTypes.js';
import { LEADERBOARD_LOGIN_LIMIT } from '../../../shared/leaderboard/leaderboardTypes.js';
import {
  fetchLeaderboardSnapshot,
  LEADERBOARD_POLL_MS,
} from '../../leaderboard/fetchLeaderboard.js';

export function useLiveLeaderboard(
  boardId: LeaderboardBoardId,
  options: {
    readonly classId?: ClassType;
    readonly limit?: number;
  } = {},
): {
  readonly snapshot: LeaderboardSnapshot | null;
  readonly loading: boolean;
} {
  const [snapshot, setSnapshot] = useState<LeaderboardSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const classId = options.classId;
  const limit = options.limit ?? LEADERBOARD_LOGIN_LIMIT;

  useEffect(() => {
    let cancelled = false;

    const pull = async (): Promise<void> => {
      try {
        const next = await fetchLeaderboardSnapshot({
          boardId,
          ...(classId ? { classId } : {}),
          limit,
        });
        if (!cancelled) {
          setSnapshot(next);
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    };

    void pull();
    const timer = window.setInterval(() => {
      void pull();
    }, LEADERBOARD_POLL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [boardId, classId, limit]);

  return { snapshot, loading };
}
