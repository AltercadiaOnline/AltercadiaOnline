import type { ClassType } from '../../shared/types/classes.js';
import { isClassType } from '../../shared/progression/movesetMasterySeed.js';
import {
  isLeaderboardBoardId,
  LEADERBOARD_DEFAULT_LIMIT,
  type LeaderboardBoardId,
  type LeaderboardSnapshot,
} from '../../shared/leaderboard/leaderboardTypes.js';
import { queryLeaderboardSnapshot } from './leaderboardMemoryStore.js';

export type LeaderboardQueryInput = {
  readonly boardId?: unknown;
  readonly classId?: unknown;
  readonly limit?: unknown;
};

export function resolveLeaderboardQuery(
  input: LeaderboardQueryInput,
): { readonly boardId: LeaderboardBoardId; readonly classId: ClassType | null; readonly limit: number } | null {
  if (!isLeaderboardBoardId(input.boardId)) return null;
  const classId = isClassType(input.classId) ? input.classId : null;
  if (input.boardId === 'level_class' && !classId) return null;
  const limit = typeof input.limit === 'number' ? input.limit : LEADERBOARD_DEFAULT_LIMIT;
  return { boardId: input.boardId, classId, limit };
}

export function readLeaderboardSnapshot(input: LeaderboardQueryInput): LeaderboardSnapshot | null {
  const query = resolveLeaderboardQuery(input);
  if (!query) return null;
  return queryLeaderboardSnapshot(query.boardId, {
    classId: query.classId,
    limit: query.limit,
  });
}
