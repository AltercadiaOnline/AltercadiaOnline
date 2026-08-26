import type { ClassType } from '../../shared/types/classes.js';
import {
  isLeaderboardBoardId,
  LEADERBOARD_LOGIN_LIMIT,
  type LeaderboardBoardId,
  type LeaderboardSnapshot,
} from '../../shared/leaderboard/leaderboardTypes.js';
import { gameServerFetch } from '../net/gameServerClient.js';

export const LEADERBOARD_POLL_MS = 4_000;

export type FetchLeaderboardInput = {
  readonly boardId: LeaderboardBoardId;
  readonly classId?: ClassType;
  readonly limit?: number;
};

/**
 * Board autoritativo no servidor de jogo (Railway).
 * Nunca fetch relativo na Vercel — `/api/leaderboard` não existe no static host.
 */
export async function fetchLeaderboardSnapshot(
  input: FetchLeaderboardInput,
): Promise<LeaderboardSnapshot | null> {
  const searchParams: Record<string, string> = {
    board: input.boardId,
    limit: String(input.limit ?? LEADERBOARD_LOGIN_LIMIT),
  };
  if (input.classId) searchParams.classId = input.classId;

  try {
    const response = await gameServerFetch('/api/leaderboard', {
      auth: false,
      searchParams,
      deadlineMs: 12_000,
    });
    if (!response.ok) return null;
    const body: unknown = await response.json();
    if (!body || typeof body !== 'object') return null;
    const record = body as { ok?: unknown; snapshot?: unknown };
    if (record.ok !== true || !record.snapshot || typeof record.snapshot !== 'object') {
      return null;
    }
    const snapshot = record.snapshot as LeaderboardSnapshot;
    if (!isLeaderboardBoardId(snapshot.boardId) || !Array.isArray(snapshot.entries)) {
      return null;
    }
    return snapshot;
  } catch {
    return null;
  }
}
