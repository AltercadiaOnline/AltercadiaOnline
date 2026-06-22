import { getItemMechanicalById } from '../items/itemCatalog.js';
import { ItemCategory } from '../items/itemSchema.js';
import { isNpcVendorSellableByRarity } from './npcSellRarityPolicy.js';
import {
  calculateTradePrice,
  NPC_BUY_PRICE_RATIO,
  NPC_SELL_PRICE_RATIO,
} from './ShopManager.js';

export { NPC_BUY_PRICE_RATIO, NPC_SELL_PRICE_RATIO };

export function resolveItemValorBase(itemId: string): number | null {
  const item = getItemMechanicalById(itemId);
  if (!item?.valorBase || item.valorBase <= 0) return null;
  return item.valorBase;
}

export function resolveNpcBuyPriceFromValorBase(valorBase: number): number {
  return calculateTradePrice(valorBase, 'BUY');
}

export function resolveNpcSellPriceFromValorBase(valorBase: number): number {
  return calculateTradePrice(valorBase, 'SELL');
}

export function resolveNpcBuyPriceForItem(itemId: string): number | null {
  const valorBase = resolveItemValorBase(itemId);
  if (valorBase === null) return null;
  return resolveNpcBuyPriceFromValorBase(valorBase);
}

export function resolveNpcSellPriceForItem(itemId: string): number | null {
  const valorBase = resolveItemValorBase(itemId);
  if (valorBase === null) return null;
  return resolveNpcSellPriceFromValorBase(valorBase);
}

/** Item com valor de mercado definido — elegível ao Marketplace (qualquer raridade). */
export function isMarketplaceListableItem(itemId: string): boolean {
  const item = getItemMechanicalById(itemId);
  if (!item) return false;
  if (item.category === ItemCategory.Currency) return false;
  if (item.isTradable === false) return false;
  return resolveItemValorBase(itemId) !== null;
}

/** Item revendável ao NPC — apenas Common/Uncommon com valorBase. */
export function isNpcVendorSellableItem(itemId: string): boolean {
  if (!isMarketplaceListableItem(itemId)) return false;
  return isNpcVendorSellableByRarity(itemId);
}

/** @deprecated Use isNpcVendorSellableItem (NPC) ou isMarketplaceListableItem (P2P). */
export function isNpcSellableItem(itemId: string): boolean {
  return isNpcVendorSellableItem(itemId);
}
