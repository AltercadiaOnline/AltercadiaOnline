import type { MemorialEntry, PetMemorialBookSnapshot } from '../../../shared/pet/petMemorial.js';
import { sortMemorialEntries } from '../../../shared/pet/petMemorial.js';
import { uiEvents, UIEventType } from '../uiEvents.js';

const MEMORIAL_STORAGE_KEY = 'altercadia.petMemorialBook.v1';

type Listener = (snapshot: PetMemorialBookSnapshot) => void;

function readFromStorage(): MemorialEntry[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(MEMORIAL_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Partial<PetMemorialBookSnapshot>;
    if (!Array.isArray(parsed.entries)) return [];
    return parsed.entries.filter(
      (entry) => entry && typeof entry.memorialId === 'string' && typeof entry.petName === 'string',
    ) as MemorialEntry[];
  } catch {
    return [];
  }
}

function saveToStorage(entries: readonly MemorialEntry[]): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(MEMORIAL_STORAGE_KEY, JSON.stringify({ entries }));
  } catch {
    /* quota */
  }
}

class PetMemorialStore {
  private entries: MemorialEntry[] = [];
  private readonly listeners = new Set<Listener>();

  hydrateFromStorage(): void {
    this.entries = sortMemorialEntries(readFromStorage());
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => this.listeners.delete(listener);
  }

  getSnapshot(): PetMemorialBookSnapshot {
    return { entries: [...this.entries] };
  }

  getEntries(): readonly MemorialEntry[] {
    return [...this.entries];
  }

  append(entry: MemorialEntry): void {
    if (this.entries.some((row) => row.memorialId === entry.memorialId)) return;
    this.entries = sortMemorialEntries([entry, ...this.entries]);
    saveToStorage(this.entries);
    this.publish(entry);
  }

  reset(): void {
    this.entries = [];
    saveToStorage(this.entries);
    this.publish();
  }

  private publish(entry?: MemorialEntry): void {
    const snapshot = this.getSnapshot();
    for (const listener of this.listeners) {
      listener(snapshot);
    }
    if (entry) {
      uiEvents.emit(UIEventType.PET_MEMORIAL_CREATED, { memorial: entry });
    }
  }
}

let store: PetMemorialStore | null = null;

export function getPetMemorialStore(): PetMemorialStore {
  if (!store) {
    store = new PetMemorialStore();
    store.hydrateFromStorage();
  }
  return store;
}

export function resetPetMemorialStore(): void {
  store = null;
}

export { MEMORIAL_STORAGE_KEY };
