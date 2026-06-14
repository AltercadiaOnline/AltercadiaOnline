import type { InventorySnapshot } from '../../../shared/character/inventorySlots.js';
import { isMarketplaceListableItem } from '../../../shared/economy/itemValorEconomy.js';
import { getItemById } from '../../../shared/items/itemCatalog.js';

export type MarketSellInventoryRow = {
  readonly itemId: string;
  readonly quantity: number;
  readonly label: string;
};

export function listMarketSellInventoryRows(inventory: InventorySnapshot): readonly MarketSellInventoryRow[] {
  const rows: MarketSellInventoryRow[] = [];

  for (const slot of inventory.slots) {
    if (!slot.itemId || slot.quantity <= 0) continue;
    if (!isMarketplaceListableItem(slot.itemId)) continue;

    const item = getItemById(slot.itemId);
    rows.push({
      itemId: slot.itemId,
      quantity: slot.quantity,
      label: item?.name ?? slot.itemId,
    });
  }

  return rows.sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
}
