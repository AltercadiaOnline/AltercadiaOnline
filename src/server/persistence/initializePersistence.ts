import path from 'node:path';
import { parsePersistenceMode, PersistenceMode } from '../../shared/persistence/persistenceConfig.js';
import {
  configurePersistenceRuntime,
  flushAllPersistence,
  loadPendingLootPersistence,
} from './PersistenceGateway.js';
import { ensureDirectory } from './DatabaseUtils.js';

export type InitializedPersistence = {
  readonly mode: ReturnType<typeof parsePersistenceMode>;
  readonly dataDir: string;
};

export { flushAllPersistence };

/** Bootstrap de persistência — chamar uma vez em `server/index.ts`. */
export async function initializePersistence(
  env: NodeJS.ProcessEnv = process.env,
): Promise<InitializedPersistence> {
  const mode = parsePersistenceMode(env.PERSISTENCE_MODE);
  const dataDir = path.resolve(env.DATA_DIR?.trim() || path.join(process.cwd(), 'data'));

  configurePersistenceRuntime({ mode, dataDir });

  if (mode === PersistenceMode.File) {
    await ensureDirectory(dataDir);
    await ensureDirectory(path.join(dataDir, 'characters'));
    await loadPendingLootPersistence();
    console.log('[persistence] Modo FILE — dados em', dataDir);
  } else {
    console.log('[persistence] Modo MEMORY — estado efêmero (reinício zera progresso)');
  }

  return { mode, dataDir };
}
