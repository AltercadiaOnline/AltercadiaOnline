import type { IDataStore } from '../../shared/IDataStore.js';
import {
  getActionDispatcher,
  initActionDispatcher,
  resetActionDispatcher,
} from '../ActionDispatcher.js';
import type { IDevMockEconomyService, IEconomyService } from './IEconomyService.js';
import { getGlobalStateSynchronizer } from '../sync/GlobalStateSynchronizer.js';
import { getMutableDataStore, initDataStore, resetDataStore } from '../PlayerDataStore.js';
import {
  activateGameStoreAfterAuth,
  getGameStore,
  initGameStore,
  resetGameStore,
  resetGameStoreState,
} from '../state/GameStore.js';
import { allowsOfflineGameplayFallback } from '../runtime/onlineFirstPolicy.js';
import { isLocalGameMode } from '../runtime/gameMode.js';

export type EconomyBackend = 'mock' | 'local';

let mockService: IDevMockEconomyService | null = null;
let mockServicePromise: Promise<IDevMockEconomyService | null> | null = null;

/** Dynamic import — MockEconomyService só se fallback offline for reativado. */
function loadMockEconomyService(): Promise<IDevMockEconomyService | null> {
  if (!allowsOfflineGameplayFallback()) {
    return Promise.resolve(null);
  }
  if (mockService) {
    return Promise.resolve(mockService);
  }
  if (!mockServicePromise) {
    mockServicePromise = import('../testing/MockEconomyService.js').then(({ MockEconomyService }) => {
      const instance = new MockEconomyService();
      instance.reset();
      mockService = instance;
      return instance;
    });
  }
  return mockServicePromise;
}

function wireMockEconomyService(mock: IDevMockEconomyService): void {
  const dispatcher = getActionDispatcher();
  dispatcher.setEconomyService(mock);
  dispatcher.setMode('mock');
  // Assinatura inventário → UI; não resetar sessão se já autenticado.
  if (!getGameStore().isAuthenticated()) {
    activateGameStoreAfterAuth();
  }
  getGlobalStateSynchronizer().setRequestTransport(() => {
    mock.requestFullState();
  });
}

/** GAME_MODE=local — liga slot ao save localStorage (schema CharacterPersistenceRecord). */
export async function bindLocalGameCharacter(
  playerId: string,
  characterId: number,
  options?: {
    readonly displayName?: string;
    readonly classId?: import('../../shared/types/classes.js').ClassType;
  },
): Promise<boolean> {
  if (!isLocalGameMode()) return false;
  const mock = await loadMockEconomyService();
  if (!mock) {
    console.warn('[LocalSave] MockEconomyService indisponível — pets/itens não serão persistidos.');
    return false;
  }
  // Dispatcher inicia em 'online' (fail-closed). Em GAME_MODE=local sempre força mock.
  wireMockEconomyService(mock);
  mock.bindLocalCharacter(playerId, characterId, options);
  return true;
}

export function initEconomyLayer(mode: EconomyBackend = 'mock'): void {
  initActionDispatcher();
  initGameStore();

  if (mode === 'mock') {
    if (!allowsOfflineGameplayFallback()) {
      attachOnlineEconomyLayer();
      return;
    }

    void loadMockEconomyService().then((mock) => {
      if (!mock) return;
      // Não sobrescrever se a página já não estiver em GAME_MODE=local.
      if (!isLocalGameMode()) return;
      wireMockEconomyService(mock);
    });
    return;
  }

  mockService = null;
  mockServicePromise = null;
  initDataStore();
  const dispatcher = getActionDispatcher();
  dispatcher.setEconomyService(null);
  dispatcher.setMode('local');
  getGlobalStateSynchronizer().setRequestTransport(null);
}

/** WS conectado — servidor (local ou Railway) é autoridade. */
export function attachOnlineEconomyLayer(): void {
  mockService = null;
  initDataStore();
  activateGameStoreAfterAuth();
  const dispatcher = getActionDispatcher();
  dispatcher.setEconomyService(null);
  dispatcher.setMode('online');
}

/**
 * WS caiu — permanece online aguardando reconexão.
 * Não troca para mock: local e produção compartilham o mesmo caminho autoritativo.
 */
export function attachOfflineEconomyLayer(): void {
  activateGameStoreAfterAuth();
  mockService = null;
  const dispatcher = getActionDispatcher();
  dispatcher.setEconomyService(null);
  dispatcher.setMode('online');
  getGlobalStateSynchronizer().setRequestTransport(null);
  console.warn('[Economy] Servidor desconectado — aguardando reconexão (mesmo caminho online).');
}

export function getDataStore(): IDataStore {
  const dispatcher = getActionDispatcher();
  if (mockService && dispatcher.getMode() === 'mock') {
    return mockService;
  }
  initDataStore();
  return getMutableDataStore();
}

export function getEconomyService(): IEconomyService | null {
  return mockService;
}

export function getMockEconomyService(): IDevMockEconomyService | null {
  return mockService;
}

export function resetGame(): void {
  if (mockService) {
    mockService.reset();
    return;
  }

  resetEconomyLayer();
  initEconomyLayer('mock');
}

export function resetEconomyLayer(): void {
  mockService = null;
  mockServicePromise = null;
  resetDataStore();
  resetGameStoreState();
  resetGameStore();
  resetActionDispatcher();
}
