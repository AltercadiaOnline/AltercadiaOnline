import type { MemorialEntry, PetMemorialBookSnapshot } from '../../../shared/pet/petMemorial.js';
import { sortMemorialEntries } from '../../../shared/pet/petMemorial.js';
import { uiEvents, UIEventType } from '../uiEvents.js';

/** Legado global (conta) — migrado uma vez para o personagem ligado. */
const LEGACY_MEMORIAL_STORAGE_KEY = 'altercadia.petMemorialBook.v1';
const MEMORIAL_STORAGE_PREFIX = 'altercadia.petMemorialBook.v2:';

type Listener = (snapshot: PetMemorialBookSnapshot) => void;

export function petMemorialStorageKey(playerId: string, characterId: number): string {
  return `${MEMORIAL_STORAGE_PREFIX}${playerId}:${characterId}`;
}

function sanitizeEntries(raw: unknown): MemorialEntry[] {
  if (!raw || typeof raw !== 'object') return [];
  const parsed = raw as Partial<PetMemorialBookSnapshot> | readonly MemorialEntry[];
  const list = Array.isArray(parsed)
    ? parsed
    : (Array.isArray((parsed as Partial<PetMemorialBookSnapshot>).entries)
      ? (parsed as Partial<PetMemorialBookSnapshot>).entries!
      : []);
  return list.filter(
    (entry): entry is MemorialEntry =>
      Boolean(entry)
      && typeof entry.memorialId === 'string'
      && typeof entry.petName === 'string',
  );
}

function readScopedStorage(playerId: string, characterId: number): MemorialEntry[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(petMemorialStorageKey(playerId, characterId));
    if (!raw) return [];
    return sanitizeEntries(JSON.parse(raw) as unknown);
  } catch {
    return [];
  }
}

function writeScopedStorage(
  playerId: string,
  characterId: number,
  entries: readonly MemorialEntry[],
): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(
      petMemorialStorageKey(playerId, characterId),
      JSON.stringify({ entries }),
    );
  } catch {
    /* quota */
  }
}

export function clearPetMemorialStorage(playerId: string, characterId: number): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(petMemorialStorageKey(playerId, characterId));
  } catch {
    /* ignore */
  }
}

/** One-shot: livro global legado → personagem. */
export function consumeLegacyPetMemorialMirror(): MemorialEntry[] | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(LEGACY_MEMORIAL_STORAGE_KEY);
    if (!raw) return null;
    const entries = sanitizeEntries(JSON.parse(raw) as unknown);
    localStorage.removeItem(LEGACY_MEMORIAL_STORAGE_KEY);
    return entries.length > 0 ? entries : null;
  } catch {
    try {
      localStorage.removeItem(LEGACY_MEMORIAL_STORAGE_KEY);
    } catch {
      /* ignore */
    }
    return null;
  }
}

class PetMemorialStore {
  private playerId: string | null = null;
  private characterId: number | null = null;
  private entries: MemorialEntry[] = [];
  private readonly listeners = new Set<Listener>();
  private characterPersistHandler: (() => void) | null = null;

  /**
   * Liga o livro ao personagem ativo (mesmo contrato do pet roster).
   * `seed` = snapshot do save / servidor; senão lê chave v2 scoped.
   */
  bindCharacter(
    playerId: string,
    characterId: number,
    seed?: readonly MemorialEntry[],
  ): void {
    this.playerId = playerId;
    this.characterId = characterId;
    // seed definido (mesmo vazio) = autoridade do save; só lê storage se não veio seed.
    this.entries = sortMemorialEntries(
      seed !== undefined
        ? sanitizeEntries(seed)
        : readScopedStorage(playerId, characterId),
    );
    this.publish();
  }

  unbindCharacter(): void {
    this.playerId = null;
    this.characterId = null;
    this.entries = [];
    this.publish();
  }

  /** Persistência no CharacterPersistenceRecord (modo local). */
  registerCharacterPersistHandler(handler: () => void): () => void {
    this.characterPersistHandler = handler;
    return () => {
      if (this.characterPersistHandler === handler) {
        this.characterPersistHandler = null;
      }
    };
  }

  hydrateFromEntries(entries: readonly MemorialEntry[]): void {
    this.entries = sortMemorialEntries(sanitizeEntries(entries));
    this.persistBound();
    this.publish();
  }

  /** @deprecated Prefer bindCharacter — mantido para chamadas legadas. */
  hydrateFromStorage(): void {
    if (this.playerId !== null && this.characterId !== null) {
      this.entries = sortMemorialEntries(
        readScopedStorage(this.playerId, this.characterId),
      );
      this.publish();
    }
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

  isBound(): boolean {
    return this.playerId !== null && this.characterId !== null;
  }

  append(entry: MemorialEntry): void {
    if (this.entries.some((row) => row.memorialId === entry.memorialId)) return;
    this.entries = sortMemorialEntries([entry, ...this.entries]);
    this.persistBound();
    this.publish(entry);
  }

  reset(): void {
    this.entries = [];
    this.persistBound();
    this.publish();
  }

  private persistBound(): void {
    if (this.playerId === null || this.characterId === null) return;
    writeScopedStorage(this.playerId, this.characterId, this.entries);
    this.characterPersistHandler?.();
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
    // Não hidrata global — bindCharacter / save do personagem são a fonte.
  }
  return store;
}

export function resetPetMemorialStore(): void {
  store?.unbindCharacter();
  store = null;
}

export {
  LEGACY_MEMORIAL_STORAGE_KEY,
  MEMORIAL_STORAGE_PREFIX,
  /** @deprecated Use LEGACY_MEMORIAL_STORAGE_KEY — flat key só para migração. */
  LEGACY_MEMORIAL_STORAGE_KEY as MEMORIAL_STORAGE_KEY,
};
