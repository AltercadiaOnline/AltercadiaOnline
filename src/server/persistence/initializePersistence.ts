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

function isProductionEnv(env: NodeJS.ProcessEnv): boolean {
  return env.NODE_ENV === 'production';
}

function isEphemeralPersistenceExplicitlyAllowed(env: NodeJS.ProcessEnv): boolean {
  return env.ALLOW_EPHEMERAL_PERSISTENCE === '1' || env.ALLOW_EPHEMERAL_PERSISTENCE === 'true';
}

function assertPersistenceModeSafeForRuntime(
  mode: ReturnType<typeof parsePersistenceMode>,
  env: NodeJS.ProcessEnv,
): void {
  if (mode === PersistenceMode.Postgres) {
    throw new Error(
      '[persistence] PERSISTENCE_MODE=postgres está bloqueado: PostgresStorage ainda é stub e perderia dados. Use PERSISTENCE_MODE=file com volume durável ou implemente o CRUD SQL antes de ativar.',
    );
  }

  if (mode === PersistenceMode.Memory && isProductionEnv(env) && !isEphemeralPersistenceExplicitlyAllowed(env)) {
    throw new Error(
      '[persistence] PERSISTENCE_MODE=memory é efêmero e está bloqueado em produção. Use PERSISTENCE_MODE=file com volume durável, ou defina ALLOW_EPHEMERAL_PERSISTENCE=true apenas para deploys descartáveis.',
    );
  }
}

/** Bootstrap de persistência — chamar uma vez em `server/index.ts`. */
export async function initializePersistence(
  env: NodeJS.ProcessEnv = process.env,
): Promise<InitializedPersistence> {
  const mode = parsePersistenceMode(env.PERSISTENCE_MODE);
  assertPersistenceModeSafeForRuntime(mode, env);

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
