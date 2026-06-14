import path from 'node:path';
import { PersistenceMode } from '../../../shared/persistence/persistenceConfig.js';
import type { CharacterPersistenceRecord } from '../../../shared/persistence/characterPersistenceRecord.js';
import {
  ensureDirectory,
  readJsonFile,
  writeJsonFileAtomic,
} from '../DatabaseUtils.js';
import type {
  PersistenceStorage,
  PersistenceStorageConfig,
  PendingLootSnapshot,
} from './persistenceStorage.types.js';

/** JSON atômico em `DATA_DIR` — personagens + loot pendente. */
export class FileStorage implements PersistenceStorage {
  readonly mode = PersistenceMode.File;

  private dataDir = path.resolve(process.cwd(), 'data');

  async initialize(config: PersistenceStorageConfig): Promise<void> {
    this.dataDir = config.dataDir;
    await ensureDirectory(this.dataDir);
    await ensureDirectory(path.join(this.dataDir, 'characters'));
  }

  async shutdown(): Promise<void> {
    // flush delegado ao PersistenceGateway antes de shutdown global
  }

  isDurable(): boolean {
    return true;
  }

  private pendingLootFilePath(): string {
    return path.join(this.dataDir, 'pending-loot.json');
  }

  private characterFilePath(playerId: string, characterId: number): string {
    const safePlayer = encodeURIComponent(playerId);
    return path.join(this.dataDir, 'characters', safePlayer, `${characterId}.json`);
  }

  async loadPendingLoot(): Promise<PendingLootSnapshot | null> {
    return readJsonFile<PendingLootSnapshot>(this.pendingLootFilePath());
  }

  async savePendingLoot(snapshot: PendingLootSnapshot): Promise<void> {
    await writeJsonFileAtomic(this.pendingLootFilePath(), snapshot);
  }

  async loadCharacter(
    playerId: string,
    characterId: number,
  ): Promise<CharacterPersistenceRecord | null> {
    return readJsonFile<CharacterPersistenceRecord>(
      this.characterFilePath(playerId, characterId),
    );
  }

  async saveCharacter(record: CharacterPersistenceRecord): Promise<void> {
    await writeJsonFileAtomic(
      this.characterFilePath(record.playerId, record.characterId),
      record,
    );
  }
}
