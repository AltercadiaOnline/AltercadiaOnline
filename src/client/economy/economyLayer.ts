import type { IDataStore } from '../../shared/IDataStore.js';
import {
  getActionDispatcher,
  initActionDispatcher,
  resetActionDispatcher,
} from '../ActionDispatcher.js';
import type { IEconomyService } from './IEconomyService.js';
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
import { MockEconomyService } from '../testing/MockEconomyService.js';

export type EconomyBackend = 'mock' | 'local';

let mockService: MockEconomyService | null = null;

export function initEconomyLayer(mode: EconomyBackend = 'mock'): void {
  initActionDispatcher();
  initGameStore();

  if (mode === 'mock') {
    resetDataStore();
    mockService = new MockEconomyService();
    mockService.reset();

    const dispatcher = getActionDispatcher();
    dispatcher.setEconomyService(mockService);
    dispatcher.setMode('mock');

    getGlobalStateSynchronizer().setRequestTransport(() => {
      mockService?.requestFullState();
    });
    return;
  }

  mockService = null;
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

  if (!mockService) {
    mockService = new MockEconomyService();
  }
  mockService.syncInventoryStacksFromClient(getPlayerItemStore().toInventoryStacks(), false);

  const dispatcher = getActionDispatcher();
  dispatcher.setEconomyService(mockService);
  dispatcher.setMode('mock');
  getGlobalStateSynchronizer().setRequestTransport(() => {
    mockService?.requestFullState();
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

export function getMockEconomyService(): MockEconomyService | null {
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
  resetDataStore();
  resetGameStoreState();
  resetGameStore();
  resetActionDispatcher();
}
