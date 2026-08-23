import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { PersistenceMode } from '../../shared/persistence/persistenceConfig.js';
import { ACCOUNT_SAVE_DIR_NAME } from './persistenceLayout.js';
import { resetPersistenceRuntimeConfig, setPersistenceRuntimeConfig } from './persistenceRuntimeConfig.js';
import { readAccountScopedJson, readWorldScopedJson } from './scopedPersistenceFiles.js';
import { writeJsonFileAtomic } from './DatabaseUtils.js';

describe('scopedPersistenceFiles promote', () => {
  let root = '';

  afterEach(async () => {
    resetPersistenceRuntimeConfig();
    if (root) {
      await rm(root, { recursive: true, force: true });
      root = '';
    }
  });

  it('copia spray da raiz DATA_DIR para a pasta do mundo', async () => {
    root = await mkdtemp(path.join(os.tmpdir(), 'altercadia-scope-'));
    const worldDataDir = path.join(root, 'azul');
    const characterDataDir = path.join(root, ACCOUNT_SAVE_DIR_NAME);
    await mkdir(worldDataDir, { recursive: true });
    await writeJsonFileAtomic(path.join(root, 'world-sprays.json'), { sprays: [{ id: 'a' }] });

    setPersistenceRuntimeConfig({
      mode: PersistenceMode.File,
      baseDataDir: root,
      characterDataDir,
      worldDataDir,
      legacyCharacterDataDirs: [worldDataDir, root],
    });

    const loaded = await readWorldScopedJson<{ sprays: { id: string }[] }>('world-sprays.json');
    expect(loaded?.sprays[0]?.id).toBe('a');
    const promoted = JSON.parse(await readFile(path.join(worldDataDir, 'world-sprays.json'), 'utf8')) as {
      sprays: { id: string }[];
    };
    expect(promoted.sprays[0]?.id).toBe('a');
  });

  it('copia marketplace do shard antigo para account/', async () => {
    root = await mkdtemp(path.join(os.tmpdir(), 'altercadia-mkt-'));
    const worldDataDir = path.join(root, 'azul');
    const characterDataDir = path.join(root, ACCOUNT_SAVE_DIR_NAME);
    await mkdir(worldDataDir, { recursive: true });
    await writeJsonFileAtomic(path.join(worldDataDir, 'global-marketplace.json'), {
      listings: [{ id: 'l1' }],
    });

    setPersistenceRuntimeConfig({
      mode: PersistenceMode.File,
      baseDataDir: root,
      characterDataDir,
      worldDataDir,
      legacyCharacterDataDirs: [worldDataDir, root],
    });

    const loaded = await readAccountScopedJson<{ listings: { id: string }[] }>('global-marketplace.json');
    expect(loaded?.listings[0]?.id).toBe('l1');
    const promoted = JSON.parse(
      await readFile(path.join(characterDataDir, 'global-marketplace.json'), 'utf8'),
    ) as { listings: { id: string }[] };
    expect(promoted.listings[0]?.id).toBe('l1');
  });
});
