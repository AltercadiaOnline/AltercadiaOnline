import { PersistenceMode, type PersistenceModeId } from '../../../shared/persistence/persistenceConfig.js';
import type { PersistenceStorage } from './persistenceStorage.types.js';
import { FileStorage } from './FileStorage.js';
import { MemoryStorage } from './MemoryStorage.js';
import { PostgresStorage } from './PostgresStorage.js';

/** Factory — seleciona strategy conforme `PERSISTENCE_MODE`. */
export function createPersistenceStorage(mode: PersistenceModeId): PersistenceStorage {
  switch (mode) {
    case PersistenceMode.File:
      return new FileStorage();
    case PersistenceMode.Postgres:
      return new PostgresStorage();
    case PersistenceMode.Memory:
    default:
      return new MemoryStorage();
  }
}
