import type { ClassType } from '../../shared/types/classes.js';
import { characterPersistenceKey } from '../../shared/persistence/characterPersistenceRecord.js';
import {
  LEADERBOARD_DEFAULT_LIMIT,
  LEADERBOARD_MAX_LIMIT,
  type LeaderboardBoardId,
  type LeaderboardSnapshot,
  type LeaderboardStatRow,
} from '../../shared/leaderboard/leaderboardTypes.js';
import {
  compareLeaderboardRows,
  leaderboardScoreHeader,
  leaderboardTitle,
  rowQualifiesForBoard,
  toPublicLeaderboardEntries,
} from '../../shared/leaderboard/leaderboardSort.js';

const rows = new Map<string, LeaderboardStatRow>();
const boardCache = new Map<string, { readonly at: number; readonly snapshot: LeaderboardSnapshot }>();
const CACHE_TTL_MS = 3_000;

let persistHook: (() => void) | null = null;

export function setLeaderboardPersistHook(hook: (() => void) | null): void {
  persistHook = hook;
}

export function leaderboardRowKey(playerId: string, characterId: number): string {
  return characterPersistenceKey(playerId, characterId);
}

export function getLeaderboardRow(playerId: string, characterId: number): LeaderboardStatRow | undefined {
  return rows.get(leaderboardRowKey(playerId, characterId));
}

export function upsertLeaderboardRow(row: LeaderboardStatRow): void {
  rows.set(leaderboardRowKey(row.playerId, row.characterId), row);
  boardCache.clear();
  persistHook?.();
}

export function removeLeaderboardRow(playerId: string, characterId: number): void {
  rows.delete(leaderboardRowKey(playerId, characterId));
  boardCache.clear();
  persistHook?.();
}

export function exportLeaderboardRows(): LeaderboardStatRow[] {
  return [...rows.values()];
}

export function importLeaderboardRows(next: readonly LeaderboardStatRow[]): void {
  rows.clear();
  for (const row of next) {
    rows.set(leaderboardRowKey(row.playerId, row.characterId), row);
  }
  boardCache.clear();
}

export function resetLeaderboardMemoryStore(): void {
  rows.clear();
  boardCache.clear();
}

function cacheKey(boardId: LeaderboardBoardId, classId: ClassType | null, limit: number): string {
  return `${boardId}:${classId ?? '-'}:${limit}`;
}

function clampLimit(limit: number | undefined): number {
  if (!Number.isFinite(limit)) return LEADERBOARD_DEFAULT_LIMIT;
  return Math.min(LEADERBOARD_MAX_LIMIT, Math.max(1, Math.floor(limit ?? LEADERBOARD_DEFAULT_LIMIT)));
}

export function queryLeaderboardSnapshot(
  boardId: LeaderboardBoardId,
  options: {
    readonly classId?: ClassType | null;
    readonly limit?: number;
  } = {},
): LeaderboardSnapshot {
  const classId = options.classId ?? null;
  const limit = clampLimit(options.limit);
  const key = cacheKey(boardId, classId, limit);
  const cached = boardCache.get(key);
  const now = Date.now();
  if (cached && now - cached.at < CACHE_TTL_MS) {
    return cached.snapshot;
  }

  const ranked = [...rows.values()]
    .filter((row) => rowQualifiesForBoard(row, boardId, classId))
    .sort((a, b) => compareLeaderboardRows(boardId, a, b))
    .slice(0, limit);

  const snapshot: LeaderboardSnapshot = {
    boardId,
    classId: boardId === 'level_class' ? classId : null,
    title: leaderboardTitle(boardId, classId),
    scoreHeader: leaderboardScoreHeader(boardId),
    entries: toPublicLeaderboardEntries(boardId, ranked),
    updatedAt: now,
    live: true,
  };
  boardCache.set(key, { at: now, snapshot });
  return snapshot;
}
