import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { PersistenceMode } from '../../../shared/persistence/persistenceConfig.js';
import { createEmptyCharacterPersistenceRecord } from '../../../shared/persistence/characterPersistenceRecord.js';
import { FileStorage } from './FileStorage.js';
import { writeJsonFileAtomic } from '../DatabaseUtils.js';

describe('FileStorage account key (userId, characterId)', () => {
  let dataDir = '';

  afterEach(async () => {
    if (dataDir) {
      await rm(dataDir, { recursive: true, force: true });
      dataDir = '';
    }
  });

  it('promove save legado do shard Azul para a pasta da conta', async () => {
    dataDir = await mkdtemp(path.join(os.tmpdir(), 'altercadia-account-'));
    const azulRoot = path.join(dataDir, 'azul');
    const accountRoot = path.join(dataDir, 'account');
    const playerId = 'user-a';
    const encoded = encodeURIComponent(playerId);
    await mkdir(path.join(azulRoot, 'characters', encoded), { recursive: true });
    const record = createEmptyCharacterPersistenceRecord(playerId, 1);
    await writeJsonFileAtomic(
      path.join(azulRoot, 'characters', encoded, '1.json'),
      record,
    );

    const storage = new FileStorage();
    await storage.initialize({
      mode: PersistenceMode.File,
      dataDir: accountRoot,
      legacyCharacterDataDirs: [azulRoot],
    });

    const loaded = await storage.loadCharacter(playerId, 1);
    expect(loaded?.characterId).toBe(1);
    expect(loaded?.playerId).toBe(playerId);
    expect(existsSync(path.join(accountRoot, 'characters', encoded, '1.json'))).toBe(true);

    const promoted = await storage.loadCharacter(playerId, 1);
    expect(promoted?.characterId).toBe(1);
    expect(await storage.listCharacterIds(playerId)).toEqual([1]);
  });
});
