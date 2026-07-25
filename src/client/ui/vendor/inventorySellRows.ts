import type { InventorySnapshot } from '../../../shared/character/inventorySlots.js';
import { getItemById } from '../../../shared/items/itemCatalog.js';
import {
  isNpcVendorSellableItem,
  resolveItemValorBase,
} from '../../../shared/economy/itemValorEconomy.js';
import { resolveInventoryItemSellQuote } from '../../../shared/economy/npcVendorService.js';

export type InventorySellRow = {
  readonly itemId: string;
  readonly quantity: number;
  readonly valorBase: number;
  readonly sellUnitPrice: number;
  readonly label: string;
};

/**
 * Drops/materiais do inventário revendáveis ao NPC (Generic Common/Uncommon).
 * Não inclui set, poções, runas nem livros — evita poluir a HUD de revenda.
 */
export function listInventorySellRows(inventory: InventorySnapshot): readonly InventorySellRow[] {
  const byItemId = new Map<string, InventorySellRow>();

  for (const slot of inventory.slots) {
    if (!slot.itemId || slot.quantity <= 0) continue;
    if (!isNpcVendorSellableItem(slot.itemId)) continue;

    const valorBase = resolveItemValorBase(slot.itemId);
    if (valorBase === null) continue;

    const quote = resolveInventoryItemSellQuote(slot.itemId, 1);
    if (!quote) continue;

    const existing = byItemId.get(slot.itemId);
    if (existing) {
      byItemId.set(slot.itemId, {
        ...existing,
        quantity: existing.quantity + slot.quantity,
      });
      continue;
    }

    const item = getItemById(slot.itemId);
    byItemId.set(slot.itemId, {
      itemId: slot.itemId,
      quantity: slot.quantity,
      valorBase,
      sellUnitPrice: quote.unitPriceVolts,
      label: item?.name ?? slot.itemId,
    });
  }

  return [...byItemId.values()].sort((a, b) => b.valorBase - a.valorBase);
}
