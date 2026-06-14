import type { BattleLootBundle } from '../shared/loot/lootTypes.js';

type StagedLootEntry = BattleLootBundle & {
  readonly characterId: number;
  readonly createdAt: number;
};

const stagedLoot = new Map<string, StagedLootEntry>();
const STALE_MS = 15 * 60 * 1000;

function purgeStale(): void {
  const now = Date.now();
  for (const [lootId, entry] of stagedLoot) {
    if (now - entry.createdAt > STALE_MS) {
      stagedLoot.delete(lootId);
    }
  }
}

export function stagePendingLoot(bundle: BattleLootBundle, characterId: number): void {
  purgeStale();
  stagedLoot.set(bundle.lootId, {
    ...bundle,
    items: bundle.items.map((item) => ({ ...item })),
    characterId,
    createdAt: Date.now(),
  });
}

export function peekPendingLoot(lootId: string): StagedLootEntry | null {
  purgeStale();
  const entry = stagedLoot.get(lootId);
  return entry ? { ...entry, items: entry.items.map((item) => ({ ...item })) } : null;
}

export function consumePendingLoot(lootId: string, winnerId: string): StagedLootEntry | null {
  purgeStale();
  const entry = stagedLoot.get(lootId);
  if (!entry || entry.winnerId !== winnerId) return null;
  stagedLoot.delete(lootId);
  return { ...entry, items: entry.items.map((item) => ({ ...item })) };
}

export function discardPendingLoot(lootId: string): void {
  stagedLoot.delete(lootId);
}

export function clearPendingLootStore(): void {
  stagedLoot.clear();
}

type StagedLootExportEntry = BattleLootBundle & {
  readonly characterId: number;
  readonly createdAt: number;
};

/** Exporta loot pendente para persistência em arquivo. */
export function exportPendingLootSnapshot(): readonly StagedLootExportEntry[] {
  purgeStale();
  return [...stagedLoot.entries()].map(([, entry]) => ({
    ...entry,
    items: entry.items.map((item) => ({ ...item })),
  }));
}

/** Restaura loot pendente após restart do servidor. */
export function importPendingLootSnapshot(entries: readonly StagedLootExportEntry[]): void {
  stagedLoot.clear();
  for (const entry of entries) {
    stagedLoot.set(entry.lootId, {
      lootId: entry.lootId,
      sourceId: entry.sourceId,
      winnerId: entry.winnerId,
      voltReward: entry.voltReward,
      items: entry.items.map((item) => ({ ...item })),
      characterId: entry.characterId,
      createdAt: entry.createdAt,
    });
  }
}
