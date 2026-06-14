import { PersistenceMode } from '../../../shared/persistence/persistenceConfig.js';
import type { CharacterPersistenceRecord } from '../../../shared/persistence/characterPersistenceRecord.js';
import { getDatabaseConnectionString } from '../databaseConnection.js';
import { closePgPool, initPgPool } from '../DatabaseUtils.js';
import type {
  PersistenceStorage,
  PersistenceStorageConfig,
  PendingLootSnapshot,
} from './persistenceStorage.types.js';

let schemaWarned = false;

function warnSchemaPending(operation: string): void {
  if (schemaWarned) return;
  schemaWarned = true;
  console.warn(
    `[PostgresStorage] ${operation} — schema SQL ainda não implementado; plugue queries aqui.`,
  );
}

/**
 * Postgres via pool `pg` — estrutura pronta; CRUD SQL entra depois.
 * Exige `DATABASE_URL` (ou DATABASE_* parcial) em runtime.
 */
export class PostgresStorage implements PersistenceStorage {
  readonly mode = PersistenceMode.Postgres;

  async initialize(_config: PersistenceStorageConfig): Promise<void> {
    const connectionString = getDatabaseConnectionString();
    if (!connectionString) {
      throw new Error(
        '[PostgresStorage] DATABASE_URL (ou DATABASE_HOST/USER/PASSWORD/NAME) é obrigatório quando PERSISTENCE_MODE=postgres',
      );
    }

    await initPgPool(connectionString);
    console.log('[persistence] Modo POSTGRES — pool pg inicializado (schema pendente)');
  }

  async shutdown(): Promise<void> {
    await closePgPool();
  }

  isDurable(): boolean {
    return true;
  }

  async loadPendingLoot(): Promise<PendingLootSnapshot | null> {
    warnSchemaPending('loadPendingLoot');
    return null;
  }

  async savePendingLoot(_snapshot: PendingLootSnapshot): Promise<void> {
    warnSchemaPending('savePendingLoot');
  }

  async loadCharacter(
    _playerId: string,
    _characterId: number,
  ): Promise<CharacterPersistenceRecord | null> {
    warnSchemaPending('loadCharacter');
    return null;
  }

  async saveCharacter(_record: CharacterPersistenceRecord): Promise<void> {
    warnSchemaPending('saveCharacter');
  }
}
