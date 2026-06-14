import type { WorldLoreEntry } from './worldLoreTypes.js';

/** Repositório in-memory de eventos do mundo — instanciado no servidor e no mock local. */
export class WorldLoreStore {
  private entries: WorldLoreEntry[] = [];

  append(entry: WorldLoreEntry): void {
    this.entries.push(entry);
    this.sortEntries();
  }

  seed(entries: readonly WorldLoreEntry[]): void {
    this.entries = [...entries];
    this.sortEntries();
  }

  getEntries(): readonly WorldLoreEntry[] {
    return this.entries;
  }

  clear(): void {
    this.entries = [];
  }

  private sortEntries(): void {
    this.entries.sort((a, b) => b.occurredAt - a.occurredAt);
  }
}
