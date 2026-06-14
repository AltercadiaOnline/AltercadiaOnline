import type { DatabaseEnv } from '../config/databaseConfig.js';
import {
  isDatabaseConfigured,
  loadDatabaseEnv,
  resolveDatabaseConnectionString,
} from '../config/databaseConfig.js';

let cachedConfig: DatabaseEnv | null = null;
let cachedConnectionString: string | null | undefined;

/**
 * Configuração de banco lida de `process.env` (DATABASE_URL ou DATABASE_*).
 * Nunca incluir senha em logs — use apenas `isDatabaseConfigured()`.
 */
export function getDatabaseEnv(): DatabaseEnv {
  cachedConfig ??= loadDatabaseEnv();
  return cachedConfig;
}

/** Connection string Postgres — null quando credenciais ausentes. */
export function getDatabaseConnectionString(): string | null {
  if (cachedConnectionString === undefined) {
    cachedConnectionString = resolveDatabaseConnectionString(getDatabaseEnv());
  }
  return cachedConnectionString;
}

export function hasDatabaseConnection(): boolean {
  return isDatabaseConfigured(getDatabaseEnv());
}

/** Testes — limpa cache após alterar process.env. */
export function resetDatabaseConnectionCache(): void {
  cachedConfig = null;
  cachedConnectionString = undefined;
}
