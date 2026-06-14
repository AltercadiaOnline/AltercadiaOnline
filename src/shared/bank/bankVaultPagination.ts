import type { InventorySlotState } from '../character/inventorySlots.js';
import { INVENTORY_SLOT_COUNT } from '../character/inventorySlots.js';
import { BANK_ITEM_SLOT_CAPACITY } from './bankConstants.js';

/** Slots visíveis por página do cofre — espelha o inventário (40 slots / página). */
export const BANK_VAULT_PAGE_SLOT_COUNT = INVENTORY_SLOT_COUNT;

const EMPTY_SLOT: InventorySlotState = { itemId: null, quantity: 0 };

export function getBankVaultPageCount(
  vaultCapacity: number = BANK_ITEM_SLOT_CAPACITY,
): number {
  const capacity = Math.max(1, Math.floor(vaultCapacity));
  return Math.max(1, Math.ceil(capacity / BANK_VAULT_PAGE_SLOT_COUNT));
}

export function clampBankVaultPageIndex(
  pageIndex: number,
  vaultCapacity: number = BANK_ITEM_SLOT_CAPACITY,
): number {
  const maxPage = getBankVaultPageCount(vaultCapacity) - 1;
  return Math.max(0, Math.min(Math.floor(pageIndex), maxPage));
}

export type BankVaultPageSlice = {
  readonly pageSlots: readonly InventorySlotState[];
  readonly pageIndex: number;
  readonly globalOffset: number;
  readonly pageCount: number;
};

/**
 * Recorta uma página do array linear de slots do cofre (capacidade total).
 * Preenche com slots vazios até completar {@link BANK_VAULT_PAGE_SLOT_COUNT}.
 */
export function sliceBankVaultPageSlots(
  allVaultSlots: readonly InventorySlotState[],
  pageIndex: number,
  vaultCapacity: number = BANK_ITEM_SLOT_CAPACITY,
): BankVaultPageSlice {
  const pageCount = getBankVaultPageCount(vaultCapacity);
  const clampedPage = clampBankVaultPageIndex(pageIndex, vaultCapacity);
  const globalOffset = clampedPage * BANK_VAULT_PAGE_SLOT_COUNT;

  const pageSlots: InventorySlotState[] = [];
  for (let local = 0; local < BANK_VAULT_PAGE_SLOT_COUNT; local += 1) {
    const globalIndex = globalOffset + local;
    if (globalIndex < vaultCapacity && globalIndex < allVaultSlots.length) {
      pageSlots.push(allVaultSlots[globalIndex]!);
    } else {
      pageSlots.push(EMPTY_SLOT);
    }
  }

  return {
    pageSlots,
    pageIndex: clampedPage,
    globalOffset,
    pageCount,
  };
}
