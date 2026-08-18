import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { PersistenceMode } from '../../shared/persistence/persistenceConfig.js';
import { createEmptyCharacterPersistenceRecord } from '../../shared/persistence/characterPersistenceRecord.js';
import {
  allocateMonotonicCharacterId,
  deleteCharacterPersistence,
} from './PersistenceGateway.js';
import { FileStorage } from './storage/FileStorage.js';
import {
  resetActivePersistenceStorage,
  setActivePersistenceStorage,
} from './storage/persistenceStorageRegistry.js';

describe('allocateMonotonicCharacterId', () => {
  let dataDir = '';

  afterEach(async () => {
    resetActivePersistenceStorage();
    if (dataDir) {
      await rm(dataDir, { recursive: true, force: true });
      dataDir = '';
    }
  });

  async function useFileStorage(): Promise<FileStorage> {
    dataDir = await mkdtemp(path.join(os.tmpdir(), 'altercadia-seq-'));
    const storage = new FileStorage();
    await storage.initialize({ mode: PersistenceMode.File, dataDir });
    setActivePersistenceStorage(storage);
    return storage;
  }

  it('pula leftover de personagem deletado e não recicla o id', async () => {
    const storage = await useFileStorage();
    await storage.saveCharacter(createEmptyCharacterPersistenceRecord('user-a', 1));

    const first = await allocateMonotonicCharacterId('user-a', []);
    expect(first).toBe(2);

    await deleteCharacterPersistence('user-a', 1);
    expect(await storage.loadCharacter('user-a', 1)).toBeNull();

    const second = await allocateMonotonicCharacterId('user-a', []);
    expect(second).toBe(3);
  });
});
