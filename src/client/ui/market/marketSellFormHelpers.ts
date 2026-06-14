import type { InventorySnapshot } from '../../../shared/character/inventorySlots.js';
import { resolveItemValorBase } from '../../../shared/economy/itemValorEconomy.js';
import {
  resolveMarketplaceNetFromGross,
} from '../../../shared/economy/marketplaceEconomy.js';
import {
  resolveMarketAverageUnitPrice,
  resolveMarketListingComparison,
} from '../../../shared/economy/marketTransactionHistory.js';
import { getItemById } from '../../../shared/items/itemCatalog.js';
import { listMarketSellInventoryRows } from './marketSellForm.js';

export type MarketSellFormState = {
  readonly selectedItemId: string | null;
  readonly quantity: number;
  readonly listingUnitPrice: number;
};

export function buildDefaultMarketSellFormState(inventory: InventorySnapshot): MarketSellFormState {
  const rows = listMarketSellInventoryRows(inventory);
  const first = rows[0];
  if (!first) {
    return { selectedItemId: null, quantity: 1, listingUnitPrice: 1 };
  }

  const average = resolveMarketAverageUnitPrice(first.itemId);
  return {
    selectedItemId: first.itemId,
    quantity: 1,
    listingUnitPrice: Math.max(1, average.averageUnitPrice),
  };
}

export function resolveMarketSellFormComparison(
  state: MarketSellFormState,
  inventory: InventorySnapshot,
): ReturnType<typeof resolveMarketListingComparison> {
  if (!state.selectedItemId) return null;

  const owned = inventory.slots
    .filter((slot) => slot.itemId === state.selectedItemId)
    .reduce((sum, slot) => sum + slot.quantity, 0);

  if (owned <= 0) return null;

  const quantity = Math.min(Math.max(1, state.quantity), owned);
  return resolveMarketListingComparison({
    itemId: state.selectedItemId,
    listingUnitPrice: state.listingUnitPrice,
    quantity,
  });
}

import { formatVoltsShort } from '../../../shared/economy/premiumCurrency.js';

export function formatVolts(value: number): string {
  return formatVoltsShort(value);
}

export function resolveListingNetPreview(listingUnitPrice: number, quantity: number): number {
  return resolveMarketplaceNetFromGross(Math.max(1, listingUnitPrice) * Math.max(1, quantity));
}

export function resolveItemLabel(itemId: string): string {
  return getItemById(itemId)?.name ?? itemId;
}

export function resolveItemValorBaseOrZero(itemId: string): number {
  return resolveItemValorBase(itemId) ?? 0;
}
