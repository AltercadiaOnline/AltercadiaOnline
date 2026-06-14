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
import { MockEconomyService } from '../testing/MockEconomyService.js';

export type EconomyBackend = 'mock' | 'local';

let mockService: MockEconomyService | null = null;

export function initEconomyLayer(mode: EconomyBackend = 'mock'): void {
  initActionDispatcher();

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
  const dispatcher = getActionDispatcher();
  dispatcher.setEconomyService(null);
  dispatcher.setMode('online');
}

/** WS caiu — volta ao mock local sem apagar playerItemStore (equip na HUD continua). */
export function attachOfflineEconomyLayer(): void {
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
  resetActionDispatcher();
}
