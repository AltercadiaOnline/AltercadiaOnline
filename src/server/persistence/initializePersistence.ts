import path from 'node:path';
import { parsePersistenceMode, PersistenceMode } from '../../shared/persistence/persistenceConfig.js';
import {
  flushAllPersistence,
  loadPendingLootPersistence,
  shutdownPersistenceStorage,
} from './PersistenceGateway.js';
import { loadGlobalMarketplacePersistence } from './globalMarketplacePersistence.js';
import { createPersistenceStorage } from './storage/createPersistenceStorage.js';import {
  getActivePersistenceStorage,
  setActivePersistenceStorage,
} from './storage/persistenceStorageRegistry.js';
import { tryGetServerInstanceContext } from '../instance/ServerInstanceContext.js';

export type InitializedPersistence = {
  readonly mode: ReturnType<typeof parsePersistenceMode>;
  readonly dataDir: string;
};

export { flushAllPersistence, shutdownPersistenceStorage };

/** Bootstrap de persistência — chamar uma vez em `server/index.ts`. */
export async function initializePersistence(
  env: NodeJS.ProcessEnv = process.env,
): Promise<InitializedPersistence> {
  const mode = parsePersistenceMode(env.PERSISTENCE_MODE);
  const baseDataDir = path.resolve(env.DATA_DIR?.trim() || path.join(process.cwd(), 'data'));
  const instance = tryGetServerInstanceContext();
  const dataDir = instance
    ? path.join(baseDataDir, instance.id)
    : baseDataDir;

  const storage = createPersistenceStorage(mode);
  setActivePersistenceStorage(storage);
  await storage.initialize({ mode, dataDir });

  if (storage.isDurable()) {
    await loadPendingLootPersistence();
    await loadGlobalMarketplacePersistence();
  }

  switch (mode) {
    case PersistenceMode.File:
      console.log('[persistence] Modo FILE — dados em', dataDir);
      break;
    case PersistenceMode.Postgres:
      console.log('[persistence] Modo POSTGRES — pool ativo (schema SQL pendente)');
      break;
    default:
      console.log('[persistence] Modo MEMORY — estado efêmero (reinício zera progresso)');
      break;
  }

  return { mode, dataDir };
}

/** Modo ativo após bootstrap — útil para diagnóstico. */
export function getInitializedPersistenceMode() {
  return getActivePersistenceStorage().mode;
}
