import type { DiaryEntry, PlayerDiarySnapshot } from '../../../shared/diary/diaryEntryTypes.js';
import { sortDiaryEntries } from '../../../shared/diary/diaryEntryBuilders.js';
import { uiEvents, UIEventType } from '../uiEvents.js';

const DIARY_STORAGE_KEY = 'altercadia.playerDiary.v1';
const MAX_DIARY_ENTRIES = 120;

type Listener = (snapshot: PlayerDiarySnapshot) => void;

function readFromStorage(): DiaryEntry[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(DIARY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Partial<PlayerDiarySnapshot>;
    if (!Array.isArray(parsed.entries)) return [];
    return sortDiaryEntries(
      parsed.entries.filter(
        (entry) => entry
          && typeof entry.entryId === 'string'
          && typeof entry.type === 'string'
          && typeof entry.title === 'string'
          && typeof entry.timestamp === 'number'
          && typeof entry.content === 'string'
          && entry.metadata
          && typeof entry.metadata === 'object',
      ) as DiaryEntry[],
    );
  } catch {
    return [];
  }
}

function saveToStorage(entries: readonly DiaryEntry[]): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(DIARY_STORAGE_KEY, JSON.stringify({ entries }));
  } catch {
    // quota / private mode
  }
}

class PlayerDiaryStore {
  private entries: DiaryEntry[] = [];

  constructor() {
    this.entries = readFromStorage();
  }

  subscribe(listener: Listener): () => void {
    listener(this.getSnapshot());
    const off = uiEvents.on(UIEventType.DIARY_ENTRY_CREATED, () => {
      listener(this.getSnapshot());
    });
    return off;
  }

  getSnapshot(): PlayerDiarySnapshot {
    return { entries: [...this.entries] };
  }

  getEntries(): readonly DiaryEntry[] {
    return this.entries;
  }

  append(entry: DiaryEntry): void {
    if (this.entries.some((row) => row.entryId === entry.entryId)) return;
    this.entries = sortDiaryEntries([entry, ...this.entries]).slice(0, MAX_DIARY_ENTRIES);
    saveToStorage(this.entries);
    uiEvents.emit(UIEventType.DIARY_ENTRY_CREATED, { entry });
  }
}

let store: PlayerDiaryStore | null = null;

export function getPlayerDiaryStore(): PlayerDiaryStore {
  if (!store) store = new PlayerDiaryStore();
  return store;
}

export function resetPlayerDiaryStore(): void {
  store = null;
}

export { DIARY_STORAGE_KEY };
