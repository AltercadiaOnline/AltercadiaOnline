import path from 'node:path';
import { readdir } from 'node:fs/promises';
import { PersistenceMode } from '../../../shared/persistence/persistenceConfig.js';
import type { CharacterPersistenceRecord } from '../../../shared/persistence/characterPersistenceRecord.js';
import {
  deleteJsonFile,
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

  private characterDir(playerId: string): string {
    return path.join(this.dataDir, 'characters', encodeURIComponent(playerId));
  }

  private characterFilePath(playerId: string, characterId: number): string {
    return path.join(this.characterDir(playerId), `${characterId}.json`);
  }

  private characterIdSeqPath(playerId: string): string {
    return path.join(this.characterDir(playerId), '_id-seq.json');
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

  async deleteCharacter(playerId: string, characterId: number): Promise<void> {
    await deleteJsonFile(this.characterFilePath(playerId, characterId));
  }

  async listCharacterIds(playerId: string): Promise<readonly number[]> {
    let names: string[];
    try {
      names = await readdir(this.characterDir(playerId));
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === 'ENOENT') return [];
      throw error;
    }

    const ids: number[] = [];
    for (const name of names) {
      const match = /^(\d+)\.json$/.exec(name);
      if (!match) continue;
      const id = Number(match[1]);
      if (Number.isInteger(id) && id >= 1) ids.push(id);
    }
    return ids.sort((a, b) => a - b);
  }

  async loadCharacterIdSeq(playerId: string): Promise<number> {
    const record = await readJsonFile<{ lastAllocatedId?: unknown }>(
      this.characterIdSeqPath(playerId),
    );
    const value = record?.lastAllocatedId;
    return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : 0;
  }

  async saveCharacterIdSeq(playerId: string, lastAllocatedId: number): Promise<void> {
    await writeJsonFileAtomic(this.characterIdSeqPath(playerId), { lastAllocatedId });
  }
}
