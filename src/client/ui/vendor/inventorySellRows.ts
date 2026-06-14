import type { InventorySnapshot } from '../../../shared/character/inventorySlots.js';
import { getItemById } from '../../../shared/items/itemCatalog.js';
import {
  isMarketplaceListableItem,
  isNpcVendorSellableItem,
  resolveItemValorBase,
} from '../../../shared/economy/itemValorEconomy.js';
import { NPC_HIGH_VALUE_MARKETPLACE_HINT } from '../../../shared/economy/npcSellRarityPolicy.js';
import { resolveItemLootRarity } from '../../../shared/loot/lootRarity.js';
import { resolveInventoryItemSellQuote } from '../../../shared/economy/npcVendorService.js';

export type InventorySellRow = {
  readonly itemId: string;
  readonly quantity: number;
  readonly valorBase: number;
  readonly sellUnitPrice: number;
  readonly label: string;
};

export type InventoryNpcBlockedRow = {
  readonly itemId: string;
  readonly quantity: number;
  readonly valorBase: number;
  readonly label: string;
  readonly rarity: string;
  readonly hint: string;
};

/** Itens do inventário revendáveis ao NPC (Common/Uncommon). */
export function listInventorySellRows(inventory: InventorySnapshot): readonly InventorySellRow[] {
  const rows: InventorySellRow[] = [];

  for (const slot of inventory.slots) {
    if (!slot.itemId || slot.quantity <= 0) continue;
    if (!isNpcVendorSellableItem(slot.itemId)) continue;

    const valorBase = resolveItemValorBase(slot.itemId);
    if (valorBase === null) continue;

    const quote = resolveInventoryItemSellQuote(slot.itemId, 1);
    if (!quote) continue;

    const item = getItemById(slot.itemId);
    rows.push({
      itemId: slot.itemId,
      quantity: slot.quantity,
      valorBase,
      sellUnitPrice: quote.unitPriceVolts,
      label: item?.name ?? slot.itemId,
    });
  }

  return rows.sort((a, b) => b.valorBase - a.valorBase);
}

/** Itens valiosos demais para o NPC — exibir dica de Marketplace. */
export function listInventoryNpcBlockedRows(inventory: InventorySnapshot): readonly InventoryNpcBlockedRow[] {
  const rows: InventoryNpcBlockedRow[] = [];

  for (const slot of inventory.slots) {
    if (!slot.itemId || slot.quantity <= 0) continue;
    if (!isMarketplaceListableItem(slot.itemId)) continue;
    if (isNpcVendorSellableItem(slot.itemId)) continue;

    const valorBase = resolveItemValorBase(slot.itemId);
    if (valorBase === null) continue;

    const item = getItemById(slot.itemId);
    rows.push({
      itemId: slot.itemId,
      quantity: slot.quantity,
      valorBase,
      label: item?.name ?? slot.itemId,
      rarity: resolveItemLootRarity(slot.itemId),
      hint: NPC_HIGH_VALUE_MARKETPLACE_HINT,
    });
  }

  return rows.sort((a, b) => b.valorBase - a.valorBase);
}
