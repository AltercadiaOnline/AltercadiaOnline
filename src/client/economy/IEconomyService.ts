import type { IDataStore } from '../../shared/IDataStore.js';
import type { ClientAction } from '../ActionDispatcher.js';

export type IntentHandleResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: string };

/**
 * Backend de economia/progressão — leitura (IDataStore) + processamento de intenções.
 * MockEconomyService hoje; SupabaseEconomyService no futuro.
 */
export interface IEconomyService extends IDataStore {
  handleIntent(action: ClientAction, intentId: string): void;
  requestFullState(): void;
  reset(): void;
}
