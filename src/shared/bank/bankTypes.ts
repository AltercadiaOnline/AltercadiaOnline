import type { InventoryStack } from '../character/equipmentState.js';
import type { WithRevision } from '../snapshotRevision.js';

export type BankCurrencyBalances = {
  readonly dollarVolt: number;
  readonly alterCoins: number;
};

export type BankStorageSnapshot = WithRevision<{
  readonly itemStacks: readonly InventoryStack[];
  readonly currencies: BankCurrencyBalances;
  readonly itemCapacity: number;
  readonly itemsUsed: number;
  readonly voltsFormatted: string;
  readonly alterFormatted: string;
}>;
