/**
 * Accessor de DataStore para a UI React — sem import do Mock.
 *
 * O Mock (GAME_MODE=local) sincroniza para os mesmos stores/globalThis;
 * painéis leem o espelho PlayerDataStore, nunca o módulo de testing.
 */
import type { IDataStore } from '../../shared/IDataStore.js';
import { getMutableDataStore, initDataStore } from '../PlayerDataStore.js';

export function getDataStore(): IDataStore {
  initDataStore();
  return getMutableDataStore();
}
