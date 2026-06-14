import { resolveItemLootRarity } from '../loot/lootRarity.js';
import { LootRarity, type LootRarityId } from '../loot/lootTypes.js';

/** Comerciantes locais só compram loot rotineiro — alto valor vai ao Marketplace. */
export const NPC_BLOCKED_SELL_RARITIES: readonly LootRarityId[] = [
  LootRarity.Rare,
  LootRarity.Epic,
  LootRarity.Legendary,
];

export const NPC_HIGH_VALUE_MARKETPLACE_HINT =
  'Este item é valioso demais para comerciantes locais. Negocie no Marketplace.';

export function isHighValueLootRarity(rarity: LootRarityId): boolean {
  return (NPC_BLOCKED_SELL_RARITIES as readonly string[]).includes(rarity);
}

export function isNpcVendorSellableByRarity(itemId: string): boolean {
  return !isHighValueLootRarity(resolveItemLootRarity(itemId));
}

export function resolveNpcVendorRarityBlockReason(itemId: string): string | null {
  if (isNpcVendorSellableByRarity(itemId)) return null;
  return NPC_HIGH_VALUE_MARKETPLACE_HINT;
}
