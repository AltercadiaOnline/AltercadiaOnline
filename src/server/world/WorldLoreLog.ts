import { buildWorldChroniclesSnapshot } from '../../shared/world/worldLoreQuery.js';
import { createSeedWorldLoreEntries } from '../../shared/world/worldLoreSeed.js';
import { WorldLoreStore } from '../../shared/world/worldLoreStore.js';
import type {
  WorldChroniclesRequest,
  WorldChroniclesSnapshot,
  WorldLoreEntry,
} from '../../shared/world/worldLoreTypes.js';
import {
  beginPlayerSession,
  getPlayerLastSeenAt,
  recordPlayerLastSeen,
  type PlayerSessionPresence,
} from './playerPresenceStore.js';

/**
 * Log autoritativo de lore do mundo — alimentado por eventos do servidor.
 */
export class WorldLoreLog {
  private readonly store = new WorldLoreStore();
  private seeded = false;

  constructor() {
    this.ensureSeeded();
  }

  append(entry: WorldLoreEntry): void {
    this.ensureSeeded();
    this.store.append(entry);
  }

  getChronicles(request: WorldChroniclesRequest): WorldChroniclesSnapshot {
    this.ensureSeeded();
    const lastSeenAt = getPlayerLastSeenAt(request.playerId, request.characterId);

    return buildWorldChroniclesSnapshot({
      entries: this.store.getEntries(),
      lastSeenAt,
      ...(request.prioritizeAbsence !== undefined
        ? { prioritizeAbsence: request.prioritizeAbsence }
        : {}),
    });
  }

  onPlayerLogin(playerId: string, characterId: number): PlayerSessionPresence {
    return beginPlayerSession(playerId, characterId);
  }

  onPlayerDisconnect(playerId: string, characterId: number): void {
    recordPlayerLastSeen(playerId, characterId);
  }

  resetForTests(): void {
    this.seeded = false;
    this.store.clear();
    this.ensureSeeded();
  }

  private ensureSeeded(): void {
    if (this.seeded) return;
    this.store.seed(createSeedWorldLoreEntries());
    this.seeded = true;
  }
}

let activeLog: WorldLoreLog | null = null;

export function getWorldLoreLog(): WorldLoreLog {
  if (!activeLog) {
    activeLog = new WorldLoreLog();
  }
  return activeLog;
}

export function resetWorldLoreLog(): void {
  activeLog?.resetForTests();
  activeLog = null;
}

export type { WorldChroniclesSnapshot };
