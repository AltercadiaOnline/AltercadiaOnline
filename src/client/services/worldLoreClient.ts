import { buildWorldChroniclesSnapshot } from '../../shared/world/worldLoreQuery.js';
import { createSeedWorldLoreEntries } from '../../shared/world/worldLoreSeed.js';
import { WorldLoreStore } from '../../shared/world/worldLoreStore.js';
import type {
  WorldChroniclesRequest,
  WorldChroniclesSnapshot,
  WorldLoreEntry,
} from '../../shared/world/worldLoreTypes.js';
import { WORLD_LORE_LONG_ABSENCE_MS } from '../../shared/world/worldLoreTypes.js';

const mockStore = new WorldLoreStore();
let mockSeeded = false;

function ensureMockSeeded(): void {
  if (mockSeeded) return;
  mockStore.seed(createSeedWorldLoreEntries());
  mockSeeded = true;
}

export type ChroniclesSessionState = {
  readonly lastSeenAt: number | null;
  readonly pendingAbsencePriority: boolean;
};

let sessionState: ChroniclesSessionState = {
  lastSeenAt: null,
  pendingAbsencePriority: false,
};

type ChroniclesResultHandler = (snapshot: WorldChroniclesSnapshot) => void;

let wsRequestChronicles: ((request: WorldChroniclesRequest) => void) | null = null;
let pendingResultHandler: ChroniclesResultHandler | null = null;
let pendingTimeout: ReturnType<typeof setTimeout> | null = null;

const STORAGE_PREFIX = 'altercadia:world:lastSeen:';

function storageKey(playerId: string, characterId: number): string {
  return `${STORAGE_PREFIX}${playerId}:${characterId}`;
}

function readStoredLastSeen(playerId: string, characterId: number): number | null {
  if (typeof localStorage === 'undefined') return null;
  const raw = localStorage.getItem(storageKey(playerId, characterId));
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function writeStoredLastSeen(playerId: string, characterId: number, timestamp: number): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(storageKey(playerId, characterId), String(timestamp));
}

/** Registra transporte WS — quando indisponível, usa mock local. */
export function bindWorldLoreWsTransport(
  send: (request: WorldChroniclesRequest) => void,
  onResult: (handler: ChroniclesResultHandler) => () => void,
): () => void {
  wsRequestChronicles = send;
  return onResult((snapshot) => {
    if (pendingTimeout !== null) {
      clearTimeout(pendingTimeout);
      pendingTimeout = null;
    }
    pendingResultHandler?.(snapshot);
    pendingResultHandler = null;
  });
}

export function clearWorldLoreWsTransport(): void {
  wsRequestChronicles = null;
  pendingResultHandler = null;
  if (pendingTimeout !== null) {
    clearTimeout(pendingTimeout);
    pendingTimeout = null;
  }
}

/** Chamado ao entrar no mundo — prepara prioridade de crônicas após ausência. */
export function beginWorldChroniclesSession(
  playerId: string,
  characterId: number,
  now = Date.now(),
): ChroniclesSessionState {
  const lastSeenAt = readStoredLastSeen(playerId, characterId);
  const pendingAbsencePriority =
    lastSeenAt !== null && now - lastSeenAt >= WORLD_LORE_LONG_ABSENCE_MS;

  sessionState = {
    lastSeenAt,
    pendingAbsencePriority,
  };

  writeStoredLastSeen(playerId, characterId, now);
  return sessionState;
}

export function consumeChroniclesAbsencePriority(): boolean {
  const pending = sessionState.pendingAbsencePriority;
  sessionState = { ...sessionState, pendingAbsencePriority: false };
  return pending;
}

export function resetWorldChroniclesSession(): void {
  sessionState = { lastSeenAt: null, pendingAbsencePriority: false };
  clearWorldLoreWsTransport();
}

export function markWorldChroniclesSessionEnd(playerId: string, characterId: number): void {
  writeStoredLastSeen(playerId, characterId, Date.now());
}

/** Entradas brutas de lore — leitura local para HUDs que precisam do payload. */
export function resolveWorldLoreEntriesForClient(): readonly WorldLoreEntry[] {
  ensureMockSeeded();
  return mockStore.getEntries();
}

export async function fetchWorldChronicles(
  request: WorldChroniclesRequest,
): Promise<WorldChroniclesSnapshot> {
  if (wsRequestChronicles) {
    return new Promise((resolve, reject) => {
      pendingResultHandler = resolve;
      wsRequestChronicles?.(request);

      pendingTimeout = setTimeout(() => {
        pendingResultHandler = null;
        pendingTimeout = null;
        reject(new Error('[WorldLore] Timeout ao buscar crônicas.'));
      }, 4000);
    });
  }

  ensureMockSeeded();
  return buildWorldChroniclesSnapshot({
    entries: mockStore.getEntries(),
    lastSeenAt: sessionState.lastSeenAt,
    ...(request.prioritizeAbsence !== undefined
      ? { prioritizeAbsence: request.prioritizeAbsence }
      : {}),
  });
}
