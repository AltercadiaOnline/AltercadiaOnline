import type { IDataStore } from '../../shared/IDataStore.js';
import type { InventoryStack } from '../../shared/character/equipmentState.js';
import type { ClientAction } from '../ActionDispatcher.js';

export type IntentHandleResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: string };

/**
 * Backend de economia/progressão — leitura (IDataStore) + processamento de intenções.
 * MockEconomyService (localhost) carregado via dynamic import — nunca no bundle prod online.
 */
export interface IEconomyService extends IDataStore {
  handleIntent(action: ClientAction, intentId: string): void;
  requestFullState(): void;
  reset(): void;
}

/** Extensões do mock dev — não usar em caminhos online. */
export interface IDevMockEconomyService extends IEconomyService {
  consumeLastBattleLootDiscardedQuantity(): number;
  syncInventoryStacksFromClient(stacks: readonly InventoryStack[], notify?: boolean): void;
  syncWalletFromStore(): void;
}
