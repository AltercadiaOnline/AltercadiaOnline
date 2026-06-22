import { ItemCategory } from '../items/itemSchema.js';
import { getItemMechanicalById } from '../items/itemCatalog.js';
import { LootRarity, type LootRarityId } from './lootTypes.js';

/** Deriva raridade a partir do catálogo — cliente apenas exibe o valor do servidor. */
export function resolveItemLootRarity(itemId: string): LootRarityId {
  const item = getItemMechanicalById(itemId);
  if (!item) return LootRarity.Common;

  if (item.lootRarity) return item.lootRarity;

  switch (item.category) {
    case ItemCategory.Equipable:
      return LootRarity.Rare;
    case ItemCategory.Rune:
    case ItemCategory.Book:
      return LootRarity.Epic;
    case ItemCategory.Potion:
      return LootRarity.Uncommon;
    default:
      return LootRarity.Common;
  }
}
