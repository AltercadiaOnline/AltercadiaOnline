import type { IDataStore } from '../../shared/IDataStore.js';
import {
  getActionDispatcher,
  initActionDispatcher,
  resetActionDispatcher,
} from '../ActionDispatcher.js';
import type { IDevMockEconomyService, IEconomyService } from './IEconomyService.js';
import { getGlobalStateSynchronizer } from '../sync/GlobalStateSynchronizer.js';
import { getMutableDataStore, initDataStore, resetDataStore } from '../PlayerDataStore.js';
import { getPlayerItemStore } from '../ui/items/playerItemStore.js';
import {
  activateGameStoreAfterAuth,
  initGameStore,
  resetGameStore,
  resetGameStoreState,
} from '../state/GameStore.js';
import { allowsOfflineGameplayFallback } from '../runtime/onlineFirstPolicy.js';

export type EconomyBackend = 'mock' | 'local';

let mockService: IDevMockEconomyService | null = null;
let mockServicePromise: Promise<IDevMockEconomyService | null> | null = null;

/** Dynamic import — MockEconomyService (e Economy/*) só carrega em localhost. */
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
  getGlobalStateSynchronizer().setRequestTransport(() => {
    mock.requestFullState();
  });
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

/** WS conectado — mock não intercepta equip; servidor é autoridade. */
export function attachOnlineEconomyLayer(): void {
  mockService = null;
  initDataStore();
  activateGameStoreAfterAuth();
  const dispatcher = getActionDispatcher();
  dispatcher.setEconomyService(null);
  dispatcher.setMode('online');
}

/** WS caiu — mock local apenas em localhost; produção permanece em modo online. */
export function attachOfflineEconomyLayer(): void {
  activateGameStoreAfterAuth();

  if (!allowsOfflineGameplayFallback()) {
    mockService = null;
    const dispatcher = getActionDispatcher();
    dispatcher.setEconomyService(null);
    dispatcher.setMode('online');
    getGlobalStateSynchronizer().setRequestTransport(null);
    console.warn('[Economy] Servidor desconectado — aguardando reconexão (mock desabilitado).');
    return;
  }

  void loadMockEconomyService().then((mock) => {
    if (!mock) return;
    mock.syncInventoryStacksFromClient(getPlayerItemStore().toInventoryStacks(), false);
    wireMockEconomyService(mock);
  });
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
