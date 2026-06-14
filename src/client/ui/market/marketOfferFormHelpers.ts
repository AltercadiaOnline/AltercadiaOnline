import type { InventorySnapshot } from '../../../shared/character/inventorySlots.js';
import { resolveMarketAverageUnitPrice } from '../../../shared/economy/marketTransactionHistory.js';
import type { MarketOfferSide } from '../../../shared/economy/marketplaceOrderBook.js';
import { listMarketSellInventoryRows } from './marketSellForm.js';

export type MarketOfferFormState = {
  readonly offerSide: MarketOfferSide;
  readonly selectedItemId: string | null;
  readonly quantity: number;
  readonly unitPriceVolts: number;
  readonly anonymous: boolean;
};

export function buildDefaultMarketOfferFormState(
  inventory: InventorySnapshot,
  preferredItemId: string | null = null,
): MarketOfferFormState {
  const rows = listMarketSellInventoryRows(inventory);
  const pick = preferredItemId && rows.some((row) => row.itemId === preferredItemId)
    ? preferredItemId
    : rows[0]?.itemId ?? preferredItemId;

  const average = pick ? resolveMarketAverageUnitPrice(pick) : null;

  return {
    offerSide: 'sell',
    selectedItemId: pick,
    quantity: 1,
    unitPriceVolts: Math.max(1, average?.averageUnitPrice ?? 1),
    anonymous: false,
  };
}

export function clampMarketOfferQuantity(
  offerSide: MarketOfferSide,
  itemId: string | null,
  quantity: number,
  inventory: InventorySnapshot,
): number {
  const qty = Math.max(1, Math.floor(quantity));
  if (offerSide !== 'sell' || !itemId) return qty;

  const owned = inventory.slots
    .filter((slot) => slot.itemId === itemId)
    .reduce((sum, slot) => sum + slot.quantity, 0);

  if (owned <= 0) return 1;
  return Math.min(qty, owned);
}
