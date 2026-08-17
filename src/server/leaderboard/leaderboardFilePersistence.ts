import path from 'node:path';
import {
  readJsonFile,
  writeJsonFileAtomic,
} from '../persistence/DatabaseUtils.js';
import type { LeaderboardStatRow } from '../../shared/leaderboard/leaderboardTypes.js';
import {
  exportLeaderboardRows,
  importLeaderboardRows,
  setLeaderboardPersistHook,
} from './leaderboardMemoryStore.js';

type LeaderboardFileSnapshot = {
  readonly schemaVersion: 1;
  readonly updatedAt: number;
  readonly rows: readonly LeaderboardStatRow[];
};

let persistTimer: ReturnType<typeof setTimeout> | null = null;
let dataFilePath: string | null = null;

function fileSnapshot(): LeaderboardFileSnapshot {
  return {
    schemaVersion: 1,
    updatedAt: Date.now(),
    rows: exportLeaderboardRows(),
  };
}

function schedulePersist(): void {
  if (!dataFilePath) return;
  if (persistTimer !== null) return;
  persistTimer = setTimeout(() => {
    persistTimer = null;
    const target = dataFilePath;
    if (!target) return;
    void writeJsonFileAtomic(target, fileSnapshot()).catch((error: unknown) => {
      console.warn('[leaderboard] persist falhou', {
        message: error instanceof Error ? error.message : 'unknown',
      });
    });
  }, 750);
}

export async function initializeLeaderboardPersistence(dataDir: string): Promise<void> {
  dataFilePath = path.join(dataDir, 'leaderboard.json');
  const loaded = await readJsonFile<LeaderboardFileSnapshot>(dataFilePath);
  if (loaded && loaded.schemaVersion === 1 && Array.isArray(loaded.rows)) {
    importLeaderboardRows(loaded.rows);
  }
  setLeaderboardPersistHook(schedulePersist);
}

export async function flushLeaderboardPersistence(): Promise<void> {
  if (!dataFilePath) return;
  if (persistTimer !== null) {
    clearTimeout(persistTimer);
    persistTimer = null;
  }
  await writeJsonFileAtomic(dataFilePath, fileSnapshot());
}
