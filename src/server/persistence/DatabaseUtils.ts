import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import pg from 'pg';

const { Pool } = pg;

type PgPool = pg.Pool;
type PgPoolClient = pg.PoolClient;

const locks = new Map<string, Promise<void>>();

let pgPool: PgPool | null = null;

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
 * Inicializa pool Postgres — usado por `PostgresStorage` quando `PERSISTENCE_MODE=postgres`.
 */
export async function initPgPool(connectionString: string): Promise<PgPool> {
  if (pgPool) return pgPool;

  pgPool = new Pool({
    connectionString,
    max: Number(process.env.DATABASE_POOL_MAX ?? 10),
    idleTimeoutMillis: Number(process.env.DATABASE_POOL_IDLE_MS ?? 30_000),
    connectionTimeoutMillis: Number(process.env.DATABASE_POOL_CONNECT_MS ?? 10_000),
  });

  const client = await pgPool.connect();
  try {
    await client.query('SELECT 1');
  } finally {
    client.release();
  }

  return pgPool;
}

export function getPgPool(): PgPool | null {
  return pgPool;
}

export function isPgPoolReady(): boolean {
  return pgPool !== null;
}

export async function closePgPool(): Promise<void> {
  if (!pgPool) return;
  const pool = pgPool;
  pgPool = null;
  await pool.end();
}

/** Testes — limpa pool sem fechar conexões externas. */
export function resetPgPoolForTests(): void {
  pgPool = null;
}

/**
 * Transação SQL atômica — BEGIN → fn(client) → COMMIT / ROLLBACK.
 * Plug para `PostgresStorage` quando schema estiver pronto.
 */
export async function executeSqlTransaction<T>(
  fn: (client: PgPoolClient) => Promise<T>,
): Promise<T> {
  const pool = getPgPool();
  if (!pool) {
    throw new Error('[DatabaseUtils] Pool Postgres não inicializado — use PERSISTENCE_MODE=postgres');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Transação atômica em arquivo — read → mutate → write temp → rename.
 * Mantido para `FileStorage` / legado JSON.
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

/**
 * Transação atômica — delega para arquivo hoje; Postgres usará `executeSqlTransaction`.
 */
export async function executeTransaction<T>(
  filePath: string,
  mutate: (current: T | null) => T | Promise<T>,
  parse?: (raw: string) => T | null,
): Promise<T> {
  return executeFileTransaction(filePath, mutate, parse);
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

export type { PgPool, PgPoolClient };
