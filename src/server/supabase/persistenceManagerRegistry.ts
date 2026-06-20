import type { ServerEnv } from '../config/env.js';
import { PersistenceManager } from './PersistenceManager.js';

let manager: PersistenceManager | null = null;

export function initPersistenceManager(env: ServerEnv): PersistenceManager {
  if (!manager) {
    manager = new PersistenceManager(env);
  }
  return manager;
}

export function getPersistenceManager(): PersistenceManager | null {
  return manager;
}

/** Testes / shutdown — libera singleton. */
export function resetPersistenceManager(): void {
  manager?.stop();
  manager = null;
}
