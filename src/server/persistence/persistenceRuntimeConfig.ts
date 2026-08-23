import { PersistenceMode, type PersistenceModeId } from '../../shared/persistence/persistenceConfig.js';
import type { PersistenceLayout } from './persistenceLayout.js';

export type PersistenceRuntimeConfig = PersistenceLayout & {
  readonly mode: PersistenceModeId;
};

const DEFAULT_BASE = 'data';

let runtime: PersistenceRuntimeConfig = {
  mode: PersistenceMode.Memory,
  baseDataDir: DEFAULT_BASE,
  characterDataDir: DEFAULT_BASE,
  worldDataDir: DEFAULT_BASE,
  legacyCharacterDataDirs: [],
};

export function setPersistenceRuntimeConfig(next: PersistenceRuntimeConfig): void {
  runtime = next;
}

export function getPersistenceRuntimeConfig(): PersistenceRuntimeConfig {
  return runtime;
}

/** Testes. */
export function resetPersistenceRuntimeConfig(): void {
  runtime = {
    mode: PersistenceMode.Memory,
    baseDataDir: DEFAULT_BASE,
    characterDataDir: DEFAULT_BASE,
    worldDataDir: DEFAULT_BASE,
    legacyCharacterDataDirs: [],
  };
}
