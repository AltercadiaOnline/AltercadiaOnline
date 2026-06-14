import type { AuthoritativePlayerSnapshot } from '../../shared/playerDataSnapshots.js';
import {
  type CharacterPersistenceRecord,
  CHARACTER_PERSISTENCE_SCHEMA_VERSION,
  isCharacterPersistenceRecord,
} from '../../shared/persistence/characterPersistenceRecord.js';
import { PersistenceMode, type PersistenceModeId } from '../../shared/persistence/persistenceConfig.js';
import {
  exportCharacterEconomyPersistence,
  hydrateCharacterEconomyPersistence,
} from '../../Economy/economyStore.js';
import {
  exportPendingLootSnapshot,
  importPendingLootSnapshot,
} from '../../Economy/pendingLootStore.js';
import { applyAuthoritativeLoadoutToEconomyProfile } from '../../Economy/economyStore.js';
import { getWorldProfile, saveWorldProfile } from '../world/worldProfileStore.js';
import {
  getAuthoritativeProgression,
  loadAuthoritativeProgression,
} from '../progression/authoritativeProgressionStore.js';
import { buildAuthoritativePlayerSnapshot } from './buildAuthoritativeSnapshot.js';
import { getActivePersistenceStorage } from './storage/persistenceStorageRegistry.js';

export type PersistenceRuntimeConfig = {
  readonly mode: PersistenceModeId;
  readonly dataDir: string;
};

/** Personagens carregados nesta sessão — distingue novo vs retorno. */
const hydratedFromDisk = new Set<string>();

function recordKey(playerId: string, characterId: number): string {
  return `${playerId}:${characterId}`;
}

export function getPersistenceRuntimeConfig(): PersistenceRuntimeConfig {
  const storage = getActivePersistenceStorage();
  return {
    mode: storage.mode,
    dataDir: process.env.DATA_DIR?.trim() || 'data',
  };
}

/** true quando a strategy atual persiste entre restarts (file/postgres). */
export function isDurablePersistence(): boolean {
  return getActivePersistenceStorage().isDurable();
}

/** @deprecated Preferir `isDurablePersistence()` — mantido por compatibilidade. */
export function isFilePersistenceEnabled(): boolean {
  return getActivePersistenceStorage().mode === PersistenceMode.File;
}

function buildRecordFromRuntime(
  playerId: string,
  characterId: number,
): CharacterPersistenceRecord {
  const economy = exportCharacterEconomyPersistence(playerId, characterId);
  const progressionState = getAuthoritativeProgression(playerId, characterId);
  const world = getWorldProfile(playerId, characterId);

  return {
    schemaVersion: CHARACTER_PERSISTENCE_SCHEMA_VERSION,
    playerId,
    characterId,
    updatedAt: Date.now(),
    wallet: { ...economy.wallet },
    economy: {
      inventory: economy.profile.inventory.map((row) => ({ ...row })),
      equipped: { ...economy.profile.equipped },
      activeBookBuff: economy.profile.activeBookBuff,
      bank: {
        itemStacks: economy.bank.itemStacks.map((row) => ({ ...row })),
        currencies: { ...economy.bank.currencies },
      },
    },
    world: {
      currentMapId: world.currentMapId,
      lastPosition: { ...world.lastPosition },
      facing: world.facing,
      ...(world.sessionSync !== undefined ? { sessionSync: world.sessionSync } : {}),
      ...(world.loadout !== undefined ? { loadout: world.loadout } : {}),
    },
    progression: {
      ...progressionState.progression,
      movesetMastery: { ...progressionState.progression.movesetMastery },
    },
    marcos: {
      activeMarcos: [...progressionState.marcos.activeMarcos],
      flowSpeedBase: progressionState.marcos.flowSpeedBase,
      nodeProgression: {
        byNodeId: { ...progressionState.marcos.nodeProgression.byNodeId },
      },
    },
    characterProfile: { ...progressionState.characterProfile },
  };
}

function applyRecordToRuntime(record: CharacterPersistenceRecord): void {
  hydrateCharacterEconomyPersistence(record.playerId, record.characterId, {
    wallet: { ...record.wallet },
    profile: {
      inventory: record.economy.inventory.map((row) => ({ ...row })),
      equipped: { ...record.economy.equipped },
      activeBookBuff: record.economy.activeBookBuff,
    },
    bank: {
      itemStacks: record.economy.bank.itemStacks.map((row) => ({ ...row })),
      currencies: { ...record.economy.bank.currencies },
    },
  });

  saveWorldProfile(record.playerId, record.characterId, {
    currentMapId: record.world.currentMapId,
    lastPosition: { ...record.world.lastPosition },
    facing: record.world.facing,
    ...(record.world.sessionSync !== undefined ? { sessionSync: record.world.sessionSync } : {}),
    ...(record.world.loadout !== undefined ? { loadout: record.world.loadout } : {}),
  });

  if (record.world.loadout) {
    applyAuthoritativeLoadoutToEconomyProfile(
      record.playerId,
      record.characterId,
      record.world.loadout,
    );
  }

  loadAuthoritativeProgression(record.playerId, record.characterId, {
    progression: record.progression,
    marcos: record.marcos,
    characterProfile: record.characterProfile,
  });
}

/** Carrega loot pendente (startup) via strategy ativa. */
export async function loadPendingLootPersistence(): Promise<void> {
  const storage = getActivePersistenceStorage();
  if (!storage.isDurable()) return;

  const snapshot = await storage.loadPendingLoot();
  if (!snapshot?.entries?.length) return;
  importPendingLootSnapshot(snapshot.entries);
}

/** Persiste loot pendente via strategy ativa. */
export async function persistPendingLootSnapshot(): Promise<void> {
  const storage = getActivePersistenceStorage();
  if (!storage.isDurable()) return;

  const entries = exportPendingLootSnapshot();
  await storage.savePendingLoot({ entries, updatedAt: Date.now() });
}

/**
 * Hidrata personagem via strategy — retorna true se havia save persistido.
 */
export async function hydrateCharacterSession(
  playerId: string,
  characterId: number,
): Promise<boolean> {
  const key = recordKey(playerId, characterId);
  const storage = getActivePersistenceStorage();

  if (!storage.isDurable()) {
    hydratedFromDisk.delete(key);
    return false;
  }

  const record = await storage.loadCharacter(playerId, characterId);
  if (!record || !isCharacterPersistenceRecord(record)) {
    hydratedFromDisk.delete(key);
    return false;
  }

  applyRecordToRuntime(record);
  hydratedFromDisk.add(key);
  return true;
}

export function wasCharacterHydratedFromDisk(playerId: string, characterId: number): boolean {
  return hydratedFromDisk.has(recordKey(playerId, characterId));
}

/** Grava snapshot autoritativo do personagem via strategy ativa. */
export async function persistCharacterSession(
  playerId: string,
  characterId: number,
): Promise<void> {
  const storage = getActivePersistenceStorage();
  if (!storage.isDurable()) return;

  const record = buildRecordFromRuntime(playerId, characterId);
  await storage.saveCharacter(record);
  hydratedFromDisk.add(recordKey(playerId, characterId));
}

/** Snapshot WS → cliente (full-state-sync). */
export function buildAuthoritativeSnapshotForCharacter(
  playerId: string,
  characterId: number,
): AuthoritativePlayerSnapshot {
  return buildAuthoritativePlayerSnapshot(playerId, characterId);
}

export {
  getAuthoritativeCombatMarcos,
  sanitizeAuthoritativeCombatMarcos,
  type AuthoritativeCombatMarcos,
} from './authoritativeCombatMarcos.js';

export { resolveAuthoritativeCombatLoadout } from './authoritativeCombatLoadout.js';

/** Flush global — shutdown / SIGTERM (dados pendentes). */
export async function flushAllPersistence(): Promise<void> {
  const storage = getActivePersistenceStorage();
  if (!storage.isDurable()) return;
  await persistPendingLootSnapshot();
}

/** Encerra pool/conexões da strategy (SIGTERM). */
export async function shutdownPersistenceStorage(): Promise<void> {
  await getActivePersistenceStorage().shutdown();
}

/** Testes — limpa flags de sessão. */
export function resetPersistenceSessionFlags(): void {
  hydratedFromDisk.clear();
}
