import type { CharacterPersistenceRecord } from '../../../shared/persistence/characterPersistenceRecord.js';
import type { PersistenceModeId } from '../../../shared/persistence/persistenceConfig.js';
import type { BattleLootBundle } from '../../../shared/loot/lootTypes.js';

export type PendingLootPersistenceEntry = BattleLootBundle & {
  readonly characterId: number;
  readonly createdAt: number;
};

export type PendingLootSnapshot = {
  readonly entries: readonly PendingLootPersistenceEntry[];
  readonly updatedAt: number;
};

export type PersistenceStorageConfig = {
  readonly mode: PersistenceModeId;
  readonly dataDir: string;
};

/**
 * Strategy de I/O — Memory / File / Postgres selecionado via `PERSISTENCE_MODE`.
 * Orquestração de runtime (economia, mundo) permanece em `PersistenceGateway`.
 */
export interface PersistenceStorage {
  readonly mode: PersistenceModeId;

  /** Bootstrap — diretórios, pool Postgres, etc. */
  initialize(config: PersistenceStorageConfig): Promise<void>;

  /** Shutdown — flush + fechar pool. */
  shutdown(): Promise<void>;

  /** true quando dados sobrevivem a restart (file/postgres). */
  isDurable(): boolean;

  loadPendingLoot(): Promise<PendingLootSnapshot | null>;
  savePendingLoot(snapshot: PendingLootSnapshot): Promise<void>;

  loadCharacter(
    playerId: string,
    characterId: number,
  ): Promise<CharacterPersistenceRecord | null>;

  saveCharacter(record: CharacterPersistenceRecord): Promise<void>;
}
