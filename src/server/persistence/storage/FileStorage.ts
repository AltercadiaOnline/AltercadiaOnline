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

/** JSON atômico da conta — `{dataDir}/characters/{playerId}/{characterId}.json`. */
export class FileStorage implements PersistenceStorage {
  readonly mode = PersistenceMode.File;

  private dataDir = path.resolve(process.cwd(), 'data');
  private legacyDataDirs: readonly string[] = [];

  async initialize(config: PersistenceStorageConfig): Promise<void> {
    this.dataDir = config.dataDir;
    this.legacyDataDirs = config.legacyCharacterDataDirs ?? [];
    await ensureDirectory(this.dataDir);
    await ensureDirectory(path.join(this.dataDir, 'characters'));
    await this.promotePendingLootIfNeeded();
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

  private characterDir(playerId: string, root: string = this.dataDir): string {
    return path.join(root, 'characters', encodeURIComponent(playerId));
  }

  private characterFilePath(
    playerId: string,
    characterId: number,
    root: string = this.dataDir,
  ): string {
    return path.join(this.characterDir(playerId, root), `${characterId}.json`);
  }

  private async promotePendingLootIfNeeded(): Promise<void> {
    const existing = await readJsonFile<PendingLootSnapshot>(this.pendingLootFilePath());
    if (existing) return;
    for (const legacyRoot of this.legacyDataDirs) {
      const snapshot = await readJsonFile<PendingLootSnapshot>(
        path.join(legacyRoot, 'pending-loot.json'),
      );
      if (!snapshot) continue;
      await writeJsonFileAtomic(this.pendingLootFilePath(), snapshot);
      return;
    }
  }

  private characterIdSeqPath(playerId: string, root: string = this.dataDir): string {
    return path.join(this.characterDir(playerId, root), '_id-seq.json');
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
    const primary = await readJsonFile<CharacterPersistenceRecord>(
      this.characterFilePath(playerId, characterId),
    );
    if (primary) return primary;

    for (const legacyRoot of this.legacyDataDirs) {
      const legacy = await readJsonFile<CharacterPersistenceRecord>(
        this.characterFilePath(playerId, characterId, legacyRoot),
      );
      if (!legacy) continue;
      await this.saveCharacter(legacy);
      return legacy;
    }
    return null;
  }

  async saveCharacter(record: CharacterPersistenceRecord): Promise<void> {
    await writeJsonFileAtomic(
      this.characterFilePath(record.playerId, record.characterId),
      record,
    );
  }

  async deleteCharacter(playerId: string, characterId: number): Promise<void> {
    await deleteJsonFile(this.characterFilePath(playerId, characterId));
    for (const legacyRoot of this.legacyDataDirs) {
      await deleteJsonFile(this.characterFilePath(playerId, characterId, legacyRoot));
    }
  }

  async listCharacterIds(playerId: string): Promise<readonly number[]> {
    const ids = new Set<number>();
    for (const root of [this.dataDir, ...this.legacyDataDirs]) {
      for (const id of await this.listCharacterIdsInRoot(playerId, root)) {
        ids.add(id);
      }
    }
    return [...ids].sort((a, b) => a - b);
  }

  private async listCharacterIdsInRoot(
    playerId: string,
    root: string,
  ): Promise<readonly number[]> {
    let names: string[];
    try {
      names = await readdir(this.characterDir(playerId, root));
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
    return ids;
  }

  async loadCharacterIdSeq(playerId: string): Promise<number> {
    const primary = await this.readSeqValue(this.characterIdSeqPath(playerId));
    if (primary > 0) return primary;
    for (const legacyRoot of this.legacyDataDirs) {
      const legacy = await this.readSeqValue(this.characterIdSeqPath(playerId, legacyRoot));
      if (legacy <= 0) continue;
      await this.saveCharacterIdSeq(playerId, legacy);
      return legacy;
    }
    return 0;
  }

  private async readSeqValue(filePath: string): Promise<number> {
    const record = await readJsonFile<{ lastAllocatedId?: unknown }>(filePath);
    const value = record?.lastAllocatedId;
    return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : 0;
  }

  async saveCharacterIdSeq(playerId: string, lastAllocatedId: number): Promise<void> {
    await writeJsonFileAtomic(this.characterIdSeqPath(playerId), { lastAllocatedId });
  }
}
