import { PersistenceMode } from '../../../shared/persistence/persistenceConfig.js';
import type { CharacterPersistenceRecord } from '../../../shared/persistence/characterPersistenceRecord.js';
import type {
  PersistenceStorage,
  PersistenceStorageConfig,
  PendingLootSnapshot,
} from './persistenceStorage.types.js';

/** Estado efêmero — nenhum I/O entre restarts. */
export class MemoryStorage implements PersistenceStorage {
  readonly mode = PersistenceMode.Memory;

  async initialize(_config: PersistenceStorageConfig): Promise<void> {
    // noop
  }

  async shutdown(): Promise<void> {
    // noop
  }

  isDurable(): boolean {
    return false;
  }

  async loadPendingLoot(): Promise<PendingLootSnapshot | null> {
    return null;
  }

  async savePendingLoot(_snapshot: PendingLootSnapshot): Promise<void> {
    // noop
  }

  async loadCharacter(
    _playerId: string,
    _characterId: number,
  ): Promise<CharacterPersistenceRecord | null> {
    return null;
  }

  async saveCharacter(_record: CharacterPersistenceRecord): Promise<void> {
    // noop
  }
}
