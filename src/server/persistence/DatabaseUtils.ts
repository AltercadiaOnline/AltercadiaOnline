import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

const locks = new Map<string, Promise<void>>();

async function withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const previous = locks.get(key) ?? Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });
  locks.set(key, previous.then(() => current));
  await previous;

  try {
    return await fn();
  } finally {
    release();
    if (locks.get(key) === current) {
      locks.delete(key);
    }
  }
}

/** Garante diretório pai antes de gravar JSON. */
export async function ensureDirectory(dirPath: string): Promise<void> {
  await mkdir(dirPath, { recursive: true });
}

/**
 * Transação atômica — ponto único de I/O para persistência MVP (JSON em disco).
 * Quando Postgres estiver ativo, use `getDatabaseConnectionString()` em
 * `databaseConnection.ts` e substitua por SQL dentro deste contrato.
 */
export async function executeTransaction<T>(
  filePath: string,
  mutate: (current: T | null) => T | Promise<T>,
  parse?: (raw: string) => T | null,
): Promise<T> {
  return executeFileTransaction(filePath, mutate, parse);
}

/**
 * Transação atômica em arquivo — read → mutate → write temp → rename.
 */
export async function executeFileTransaction<T>(
  filePath: string,
  mutate: (current: T | null) => T | Promise<T>,
  parse: (raw: string) => T | null = JSON.parse as (raw: string) => T,
): Promise<T> {
  return withLock(filePath, async () => {
    await ensureDirectory(path.dirname(filePath));

    let current: T | null = null;
    try {
      const raw = await readFile(filePath, 'utf8');
      current = parse(raw);
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== 'ENOENT') throw error;
    }

    const next = await mutate(current);
    const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
    await writeFile(tempPath, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
    await rename(tempPath, filePath);
    return next;
  });
}

/** Leitura sem lock prolongado — preferir dentro de executeFileTransaction para escrita. */
export async function readJsonFile<T>(
  filePath: string,
  parse: (raw: string) => T | null = JSON.parse as (raw: string) => T,
): Promise<T | null> {
  try {
    const raw = await readFile(filePath, 'utf8');
    return parse(raw);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === 'ENOENT') return null;
    throw error;
  }
}

/** Grava JSON atômico (sem read). */
export async function writeJsonFileAtomic<T>(filePath: string, value: T): Promise<void> {
  return withLock(filePath, async () => {
    await ensureDirectory(path.dirname(filePath));
    const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
    await writeFile(tempPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
    await rename(tempPath, filePath);
  });
}
