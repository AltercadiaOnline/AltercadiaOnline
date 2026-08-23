import path from 'node:path';
import { readJsonFile, writeJsonFileAtomic } from './DatabaseUtils.js';
import { getPersistenceRuntimeConfig } from './persistenceRuntimeConfig.js';

/** Lê JSON do mundo; cai na raiz `DATA_DIR` e promove para `{serverId}/`. */
export async function readWorldScopedJson<T>(fileName: string): Promise<T | null> {
  const { worldDataDir, baseDataDir } = getPersistenceRuntimeConfig();
  const primaryPath = path.join(worldDataDir, fileName);
  const primary = await readJsonFile<T>(primaryPath);
  if (primary) return primary;
  if (baseDataDir === worldDataDir) return null;
  const fallback = await readJsonFile<T>(path.join(baseDataDir, fileName));
  if (!fallback) return null;
  await writeJsonFileAtomic(primaryPath, fallback);
  return fallback;
}

export async function writeWorldScopedJson(fileName: string, value: unknown): Promise<void> {
  const { worldDataDir } = getPersistenceRuntimeConfig();
  await writeJsonFileAtomic(path.join(worldDataDir, fileName), value);
}

/** Livro da conta — `{base}/account`; fallback na raiz/shard e promove. */
export async function readAccountScopedJson<T>(fileName: string): Promise<T | null> {
  const { characterDataDir, baseDataDir, worldDataDir } = getPersistenceRuntimeConfig();
  const primaryPath = path.join(characterDataDir, fileName);
  const primary = await readJsonFile<T>(primaryPath);
  if (primary) return primary;

  const fallbackPaths: string[] = [];
  if (baseDataDir !== characterDataDir) {
    fallbackPaths.push(path.join(baseDataDir, fileName));
  }
  if (worldDataDir !== characterDataDir && worldDataDir !== baseDataDir) {
    fallbackPaths.push(path.join(worldDataDir, fileName));
  }

  for (const fallbackPath of fallbackPaths) {
    const fallback = await readJsonFile<T>(fallbackPath);
    if (!fallback) continue;
    await writeJsonFileAtomic(primaryPath, fallback);
    return fallback;
  }
  return null;
}

export async function writeAccountScopedJson(fileName: string, value: unknown): Promise<void> {
  const { characterDataDir } = getPersistenceRuntimeConfig();
  await writeJsonFileAtomic(path.join(characterDataDir, fileName), value);
}
