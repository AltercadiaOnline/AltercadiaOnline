import type { ServerInstanceDefinition } from '../../shared/world/serverInstanceCatalog.js';

let activeInstance: ServerInstanceDefinition | null = null;

/** Contexto da instância ativa — definido uma vez no bootstrap do servidor. */
export function initializeServerInstanceContext(instance: ServerInstanceDefinition): void {
  activeInstance = instance;
}

export function getServerInstanceContext(): ServerInstanceDefinition {
  if (!activeInstance) {
    throw new Error('ServerInstanceContext não inicializado — chame initializeServerInstanceContext no bootstrap.');
  }
  return activeInstance;
}

export function tryGetServerInstanceContext(): ServerInstanceDefinition | null {
  return activeInstance;
}

/** Testes — limpa instância ativa. */
export function resetServerInstanceContext(): void {
  activeInstance = null;
}
