import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { PersistenceMode } from '../../../shared/persistence/persistenceConfig.js';
import { createEmptyCharacterPersistenceRecord } from '../../../shared/persistence/characterPersistenceRecord.js';
import { FileStorage } from './FileStorage.js';

describe('FileStorage character isolation', () => {
  let dataDir = '';

  afterEach(async () => {
    if (dataDir) {
      await rm(dataDir, { recursive: true, force: true });
      dataDir = '';
    }
  });

  async function makeStorage(): Promise<FileStorage> {
    dataDir = await mkdtemp(path.join(os.tmpdir(), 'altercadia-char-'));
    const storage = new FileStorage();
    await storage.initialize({ mode: PersistenceMode.File, dataDir });
    return storage;
  }

  it('apaga o JSON no delete e não o lista mais', async () => {
    const storage = await makeStorage();
    const record = createEmptyCharacterPersistenceRecord('user-a', 1);
    await storage.saveCharacter(record);

    expect(await storage.listCharacterIds('user-a')).toEqual([1]);
    await storage.deleteCharacter('user-a', 1);
    expect(await storage.loadCharacter('user-a', 1)).toBeNull();
    expect(await storage.listCharacterIds('user-a')).toEqual([]);
  });

  it('seq sobrevive ao delete do personagem', async () => {
    const storage = await makeStorage();
    await storage.saveCharacterIdSeq('user-a', 1);
    await storage.deleteCharacter('user-a', 1);
    expect(await storage.loadCharacterIdSeq('user-a')).toBe(1);
  });

  it('record vazio nasce sem pets', async () => {
    const storage = await makeStorage();
    const record = createEmptyCharacterPersistenceRecord('user-a', 2);
    expect(record.petRoster?.pets).toEqual([]);
    await storage.saveCharacter(record);
    const loaded = await storage.loadCharacter('user-a', 2);
    expect(loaded?.petRoster?.pets ?? []).toEqual([]);
  });
});
