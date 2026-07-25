import { listAchievementDefinitions } from '../../../shared/achievements/achievementCatalog.js';
import type {
  AchievementId,
  AchievementProgressSnapshot,
  AchievementUnlockRecord,
} from '../../../shared/achievements/achievementTypes.js';
import { uiEvents, UIEventType } from '../uiEvents.js';

const STORAGE_KEY = 'altercadia.achievements.v1';

type Listener = (snapshot: AchievementProgressSnapshot) => void;

type PersistedShape = {
  readonly unlocked?: readonly AchievementUnlockRecord[];
  readonly counters?: Readonly<Record<string, number>>;
};

function readPersisted(): {
  unlocked: AchievementUnlockRecord[];
  counters: Record<string, number>;
} {
  if (typeof localStorage === 'undefined') {
    return { unlocked: [], counters: {} };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { unlocked: [], counters: {} };
    const parsed = JSON.parse(raw) as PersistedShape;
    const unlocked = Array.isArray(parsed.unlocked)
      ? parsed.unlocked.filter(
          (row) =>
            row
            && typeof row.achievementId === 'string'
            && typeof row.unlockedAt === 'number',
        )
      : [];
    const counters =
      parsed.counters && typeof parsed.counters === 'object'
        ? { ...parsed.counters }
        : {};
    return { unlocked: [...unlocked], counters };
  } catch {
    return { unlocked: [], counters: {} };
  }
}

function writePersisted(
  unlocked: readonly AchievementUnlockRecord[],
  counters: Readonly<Record<string, number>>,
): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ unlocked, counters }),
    );
  } catch {
    // quota / private mode
  }
}

class PlayerAchievementStore {
  private unlocked: AchievementUnlockRecord[] = [];
  private counters: Record<string, number> = {};
  private readonly listeners = new Set<Listener>();

  constructor() {
    const persisted = readPersisted();
    this.unlocked = persisted.unlocked;
    this.counters = persisted.counters;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => {
      this.listeners.delete(listener);
    };
  }

  getSnapshot(): AchievementProgressSnapshot {
    return {
      unlocked: [...this.unlocked],
      counters: { ...this.counters },
    };
  }

  isUnlocked(achievementId: AchievementId): boolean {
    return this.unlocked.some((row) => row.achievementId === achievementId);
  }

  getUnlock(achievementId: AchievementId): AchievementUnlockRecord | undefined {
    return this.unlocked.find((row) => row.achievementId === achievementId);
  }

  getCounter(key: string): number {
    return this.counters[key] ?? 0;
  }

  /** Incrementa contador e desbloqueia conquistas com target atingido. */
  bumpCounter(key: string, delta = 1, nowMs = Date.now()): void {
    const next = (this.counters[key] ?? 0) + delta;
    this.counters[key] = next;
    writePersisted(this.unlocked, this.counters);
    this.emit();

    for (const def of listAchievementDefinitions()) {
      if (!def.targetCount) continue;
      if (def.id === 'pve_victories_5' && key === 'pve_victories' && next >= def.targetCount) {
        this.unlock(def.id, nowMs);
      }
    }
  }

  unlock(achievementId: AchievementId, nowMs = Date.now()): boolean {
    if (this.isUnlocked(achievementId)) return false;
    if (!listAchievementDefinitions().some((d) => d.id === achievementId)) return false;

    const record: AchievementUnlockRecord = { achievementId, unlockedAt: nowMs };
    this.unlocked = [record, ...this.unlocked];
    writePersisted(this.unlocked, this.counters);
    this.emit();
    uiEvents.emit(UIEventType.ACHIEVEMENT_UNLOCKED, { achievementId, unlockedAt: nowMs });
    return true;
  }

  reset(): void {
    this.unlocked = [];
    this.counters = {};
    writePersisted(this.unlocked, this.counters);
    this.emit();
  }

  private emit(): void {
    const snap = this.getSnapshot();
    for (const listener of this.listeners) listener(snap);
  }
}

let store: PlayerAchievementStore | null = null;

export function getPlayerAchievementStore(): PlayerAchievementStore {
  if (!store) store = new PlayerAchievementStore();
  return store;
}

export function resetPlayerAchievementStore(): void {
  store?.reset();
  store = null;
}
