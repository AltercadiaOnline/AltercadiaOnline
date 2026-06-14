import type { PersistenceStorage } from './persistenceStorage.types.js';
import { MemoryStorage } from './MemoryStorage.js';

let activeStorage: PersistenceStorage = new MemoryStorage();

export function getActivePersistenceStorage(): PersistenceStorage {
  return activeStorage;
}

export function setActivePersistenceStorage(storage: PersistenceStorage): void {
  activeStorage = storage;
}

/** Testes — volta ao default in-memory. */
export function resetActivePersistenceStorage(): void {
  activeStorage = new MemoryStorage();
}
