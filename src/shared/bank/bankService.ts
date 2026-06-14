import type { InventoryStack } from '../character/equipmentState.js';
import {
  addItemToInventoryStacks,
  stacksToInventorySlotsWithStacking,
  inventorySlotsToStacks,
} from '../character/inventoryStackOps.js';
import { buildInventorySnapshot, INVENTORY_SLOT_COUNT } from '../character/inventorySlots.js';
import { formatAlterCoins, formatVolts } from '../economy/premiumCurrency.js';
import { BANK_ITEM_SLOT_CAPACITY } from './bankConstants.js';
import type { BankCurrencyBalances } from './bankTypes.js';
import type { BankCurrencyTypeId } from './bankConstants.js';

export type BankWalletSnapshot = {
  readonly dollarVolt: number;
  readonly alterCoins: number;
};

export type BankSwapSuccess<T> = { readonly ok: true; readonly value: T };
export type BankSwapFailure = { readonly ok: false; readonly reason: string };
export type BankSwapResult<T> = BankSwapSuccess<T> | BankSwapFailure;

export type ItemBankSwapResult = {
  readonly inventoryStacks: InventoryStack[];
  readonly bankStacks: InventoryStack[];
};

export type CurrencyBankSwapResult = {
  readonly wallet: BankWalletSnapshot;
  readonly bankCurrencies: BankCurrencyBalances;
};

function normalizeQuantity(quantity: number): number | null {
  if (!Number.isFinite(quantity)) return null;
  const amount = Math.floor(quantity);
  if (amount <= 0) return null;
  return amount;
}

function countBankSlotsUsed(stacks: readonly InventoryStack[]): number {
  return buildInventorySnapshot(
    stacksToInventorySlotsWithStacking(stacks, BANK_ITEM_SLOT_CAPACITY),
    BANK_ITEM_SLOT_CAPACITY,
  ).used;
}

function removeFromStacks(
  stacks: readonly InventoryStack[],
  itemId: string,
  quantity: number,
): BankSwapResult<InventoryStack[]> {
  const amount = normalizeQuantity(quantity);
  if (amount === null) {
    return { ok: false, reason: 'Quantidade inválida.' };
  }

  const index = stacks.findIndex((stack) => stack.itemId === itemId);
  if (index < 0) {
    return { ok: false, reason: 'Item não encontrado.' };
  }

  const stack = stacks[index]!;
  if (stack.quantity < amount) {
    return { ok: false, reason: 'Quantidade insuficiente.' };
  }

  const nextQty = stack.quantity - amount;
  const nextStacks = stacks
    .map((entry, i) => (i === index ? { ...entry, quantity: nextQty } : entry))
    .filter((entry) => entry.quantity > 0);

  return { ok: true, value: nextStacks };
}

/** AtomicSwap — inventário → cofre. */
export function depositItemSwap(
  inventoryStacks: readonly InventoryStack[],
  bankStacks: readonly InventoryStack[],
  itemId: string,
  quantity: number,
): BankSwapResult<ItemBankSwapResult> {
  if (itemId === 'dollar_volt' || itemId === 'gold') {
    return { ok: false, reason: 'Use a aba de moedas para depositar Volts.' };
  }

  const removed = removeFromStacks(inventoryStacks, itemId, quantity);
  if (!removed.ok) return removed;

  const added = addItemToInventoryStacks(
    bankStacks,
    itemId,
    quantity,
    BANK_ITEM_SLOT_CAPACITY,
  );
  if (added.overflow > 0) {
    return { ok: false, reason: 'Cofre cheio — libere espaço no banco.' };
  }

  return {
    ok: true,
    value: {
      inventoryStacks: removed.value,
      bankStacks: added.stacks,
    },
  };
}

/** AtomicSwap — cofre → inventário. */
export function withdrawItemSwap(
  inventoryStacks: readonly InventoryStack[],
  bankStacks: readonly InventoryStack[],
  itemId: string,
  quantity: number,
  inventoryCapacity = INVENTORY_SLOT_COUNT,
): BankSwapResult<ItemBankSwapResult> {
  const removed = removeFromStacks(bankStacks, itemId, quantity);
  if (!removed.ok) return removed;

  const added = addItemToInventoryStacks(
    inventoryStacks,
    itemId,
    quantity,
    inventoryCapacity,
  );
  if (added.overflow > 0) {
    return { ok: false, reason: 'Inventário cheio — libere espaço antes de sacar.' };
  }

  return {
    ok: true,
    value: {
      inventoryStacks: added.stacks,
      bankStacks: removed.value,
    },
  };
}

function resolveCurrencyAmount(
  balances: BankCurrencyBalances | BankWalletSnapshot,
  currency: BankCurrencyTypeId,
): number {
  return currency === 'volts' ? balances.dollarVolt : balances.alterCoins;
}

function applyCurrencyDelta(
  balances: BankCurrencyBalances,
  currency: BankCurrencyTypeId,
  delta: number,
): BankCurrencyBalances {
  if (currency === 'volts') {
    return { ...balances, dollarVolt: balances.dollarVolt + delta };
  }
  return { ...balances, alterCoins: balances.alterCoins + delta };
}

/** Depósito de moeda — carteira → cofre. */
export function depositCurrencySwap(
  wallet: BankWalletSnapshot,
  bankCurrencies: BankCurrencyBalances,
  currency: BankCurrencyTypeId,
  amount: number,
): BankSwapResult<CurrencyBankSwapResult> {
  const qty = normalizeQuantity(amount);
  if (qty === null) {
    return { ok: false, reason: 'Informe um valor positivo.' };
  }

  const walletBalance = resolveCurrencyAmount(wallet, currency);
  if (walletBalance < qty) {
    return {
      ok: false,
      reason: currency === 'volts' ? 'Volts insuficientes na carteira.' : 'Alter Coins insuficientes na carteira.',
    };
  }

  const nextWallet = applyCurrencyDelta(wallet, currency, -qty);
  const nextBank = applyCurrencyDelta(bankCurrencies, currency, qty);

  if (nextWallet.dollarVolt < 0 || nextWallet.alterCoins < 0) {
    return { ok: false, reason: 'Operação resultaria em saldo negativo.' };
  }

  return {
    ok: true,
    value: { wallet: nextWallet, bankCurrencies: nextBank },
  };
}

/** Saque de moeda — cofre → carteira. */
export function withdrawCurrencySwap(
  wallet: BankWalletSnapshot,
  bankCurrencies: BankCurrencyBalances,
  currency: BankCurrencyTypeId,
  amount: number,
): BankSwapResult<CurrencyBankSwapResult> {
  const qty = normalizeQuantity(amount);
  if (qty === null) {
    return { ok: false, reason: 'Informe um valor positivo.' };
  }

  const bankBalance = resolveCurrencyAmount(bankCurrencies, currency);
  if (bankBalance < qty) {
    return {
      ok: false,
      reason: currency === 'volts' ? 'Volts insuficientes no banco.' : 'Alter Coins insuficientes no banco.',
    };
  }

  const nextBank = applyCurrencyDelta(bankCurrencies, currency, -qty);
  const nextWallet = applyCurrencyDelta(wallet, currency, qty);

  if (nextBank.dollarVolt < 0 || nextBank.alterCoins < 0) {
    return { ok: false, reason: 'Operação resultaria em saldo negativo no banco.' };
  }

  return {
    ok: true,
    value: { wallet: nextWallet, bankCurrencies: nextBank },
  };
}

export function buildBankStorageView(
  itemStacks: readonly InventoryStack[],
  currencies: BankCurrencyBalances,
): {
  itemStacks: InventoryStack[];
  currencies: BankCurrencyBalances;
  itemCapacity: number;
  itemsUsed: number;
  voltsFormatted: string;
  alterFormatted: string;
} {
  return {
    itemStacks: itemStacks.map((stack) => ({ ...stack })),
    currencies: { ...currencies },
    itemCapacity: BANK_ITEM_SLOT_CAPACITY,
    itemsUsed: countBankSlotsUsed(itemStacks),
    voltsFormatted: formatVolts(currencies.dollarVolt),
    alterFormatted: formatAlterCoins(currencies.alterCoins),
  };
}
