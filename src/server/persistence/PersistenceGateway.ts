import path from 'node:path';
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
import { readJsonFile, writeJsonFileAtomic } from './DatabaseUtils.js';

export type PersistenceRuntimeConfig = {
  readonly mode: PersistenceModeId;
  readonly dataDir: string;
};

let runtimeConfig: PersistenceRuntimeConfig = {
  mode: PersistenceMode.Memory,
  dataDir: path.resolve(process.cwd(), 'data'),
};

/** Personagens carregados nesta sessão — distingue novo vs retorno. */
const hydratedFromDisk = new Set<string>();

export function configurePersistenceRuntime(config: PersistenceRuntimeConfig): void {
  runtimeConfig = config;
}

export function getPersistenceRuntimeConfig(): PersistenceRuntimeConfig {
  return runtimeConfig;
}

export function isFilePersistenceEnabled(): boolean {
  return runtimeConfig.mode === PersistenceMode.File;
}

function characterFilePath(playerId: string, characterId: number): string {
  const safePlayer = encodeURIComponent(playerId);
  return path.join(
    runtimeConfig.dataDir,
    'characters',
    safePlayer,
    `${characterId}.json`,
  );
}

function pendingLootFilePath(): string {
  return path.join(runtimeConfig.dataDir, 'pending-loot.json');
}

function recordKey(playerId: string, characterId: number): string {
  return `${playerId}:${characterId}`;
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

/** Carrega loot pendente do disco (startup). */
export async function loadPendingLootPersistence(): Promise<void> {
  if (!isFilePersistenceEnabled()) return;
  const snapshot = await readJsonFile<{ readonly entries: ReturnType<typeof exportPendingLootSnapshot> }>(
    pendingLootFilePath(),
  );
  if (!snapshot?.entries) return;
  importPendingLootSnapshot(snapshot.entries);
}

/** Persiste loot pendente no disco. */
export async function persistPendingLootSnapshot(): Promise<void> {
  if (!isFilePersistenceEnabled()) return;
  const entries = exportPendingLootSnapshot();
  await writeJsonFileAtomic(pendingLootFilePath(), { entries, updatedAt: Date.now() });
}

/**
 * Hidrata personagem — file mode lê JSON; memory mode marca como novo.
 * Retorna true se havia save no disco.
 */
export async function hydrateCharacterSession(
  playerId: string,
  characterId: number,
): Promise<boolean> {
  const key = recordKey(playerId, characterId);

  if (!isFilePersistenceEnabled()) {
    hydratedFromDisk.delete(key);
    return false;
  }

  const filePath = characterFilePath(playerId, characterId);
  const record = await readJsonFile<CharacterPersistenceRecord>(filePath);
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

/** Grava snapshot autoritativo do personagem. */
export async function persistCharacterSession(
  playerId: string,
  characterId: number,
): Promise<void> {
  if (!isFilePersistenceEnabled()) return;

  const record = buildRecordFromRuntime(playerId, characterId);
  await writeJsonFileAtomic(characterFilePath(playerId, characterId), record);
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

/** Flush global — shutdown Vercel / SIGTERM. */
export async function flushAllPersistence(): Promise<void> {
  if (!isFilePersistenceEnabled()) return;
  await persistPendingLootSnapshot();
}

/** Testes — limpa flags de sessão. */
export function resetPersistenceSessionFlags(): void {
  hydratedFromDisk.clear();
}
