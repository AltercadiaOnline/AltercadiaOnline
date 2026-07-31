import type { InventoryStack } from '../character/equipmentState.js';
import {
  ALTER_COIN_ITEM_ID,
  DOLLAR_VOLT_ITEM_ID,
} from './premiumCurrency.js';

export type WalletCurrencyBalances = {
  readonly dollarVolt: number;
  readonly alterCoins: number;
};

export function isWalletCurrencyItemId(itemId: string): boolean {
  return itemId === DOLLAR_VOLT_ITEM_ID || itemId === ALTER_COIN_ITEM_ID;
}

function normalizeBalance(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
}

/**
 * Espelha a carteira (SSOT) em stacks de inventário `dollar_volt` / `alter_coin`.
 * - Preserva a posição existente da pilha de moeda
 * - Remove órfãos / duplicatas
 * - qty 0 → remove o stack (libera slot)
 * Gastos/créditos continuam só na wallet; isto é projeção para o bag.
 */
export function mirrorWalletCurrencyStacks(
  inventory: readonly InventoryStack[],
  wallet: WalletCurrencyBalances,
): InventoryStack[] {
  const dollarVolt = normalizeBalance(wallet.dollarVolt);
  const alterCoins = normalizeBalance(wallet.alterCoins);

  const next: InventoryStack[] = [];
  let voltPlaced = false;
  let alterPlaced = false;

  for (const row of inventory) {
    if (row.itemId === DOLLAR_VOLT_ITEM_ID) {
      if (!voltPlaced && dollarVolt > 0) {
        next.push({ itemId: DOLLAR_VOLT_ITEM_ID, quantity: dollarVolt });
        voltPlaced = true;
      }
      continue;
    }
    if (row.itemId === ALTER_COIN_ITEM_ID) {
      if (!alterPlaced && alterCoins > 0) {
        next.push({ itemId: ALTER_COIN_ITEM_ID, quantity: alterCoins });
        alterPlaced = true;
      }
      continue;
    }
    next.push({
      itemId: row.itemId,
      quantity: row.quantity,
      ...(row.charges !== undefined ? { charges: row.charges } : {}),
      ...(row.lockedQuantity !== undefined ? { lockedQuantity: row.lockedQuantity } : {}),
    });
  }

  if (!voltPlaced && dollarVolt > 0) {
    next.push({ itemId: DOLLAR_VOLT_ITEM_ID, quantity: dollarVolt });
  }
  if (!alterPlaced && alterCoins > 0) {
    next.push({ itemId: ALTER_COIN_ITEM_ID, quantity: alterCoins });
  }

  return next;
}
