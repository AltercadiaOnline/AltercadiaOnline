import { getAuthoritativeItemById } from '../items/itemCatalogAuthoritative.js';
import type { NpcVendorListing } from './npcVendorCatalog.js';
import {
  isNpcVendorSellableItem,
  resolveItemValorBase,
  resolveNpcBuyPriceForItem,
  resolveNpcSellPriceForItem,
  resolveNpcSellPriceFromValorBase,
} from './itemValorEconomy.js';
import { resolveNpcVendorRarityBlockReason } from './npcSellRarityPolicy.js';
import { assertValidTradeSpread } from './ShopManager.js';
import { validateSoulboundRetention } from './soulboundInventoryPolicy.js';

export type NpcTradeQuote = {
  readonly unitPriceVolts: number;
  readonly quantity: number;
  readonly totalVolts: number;
  readonly itemLabel: string;
  readonly valorBase: number | null;
};

function resolveQuote(
  itemId: string,
  quantity: number,
  unitPriceVolts: number,
): NpcTradeQuote | null {
  const item = getAuthoritativeItemById(itemId);
  if (!item) return null;

  const qty = Math.max(1, Math.floor(quantity));
  return {
    unitPriceVolts,
    quantity: qty,
    totalVolts: unitPriceVolts * qty,
    itemLabel: item.name,
    valorBase: resolveItemValorBase(itemId),
  };
}

export function resolveEffectiveNpcBuyUnitPrice(
  itemId: string,
  listing?: NpcVendorListing,
): number | null {
  const fromValorBase = resolveNpcBuyPriceForItem(itemId);
  if (fromValorBase !== null) return fromValorBase;
  if (listing) return listing.npcBuyPriceVolts;
  return null;
}

export function resolveNpcPurchaseQuote(
  listing: NpcVendorListing,
  quantity: number,
): NpcTradeQuote | null {
  const unitPrice = resolveEffectiveNpcBuyUnitPrice(listing.itemId, listing);
  if (unitPrice === null) return null;
  return resolveQuote(listing.itemId, quantity, unitPrice);
}

export function resolveNpcSellQuote(
  listing: NpcVendorListing,
  quantity: number,
): NpcTradeQuote | null {
  const unitPrice = resolveEffectiveNpcSellUnitPrice(listing.itemId, listing);
  if (unitPrice === null) return null;
  return resolveQuote(listing.itemId, quantity, unitPrice);
}

export function resolveInventoryItemSellQuote(
  itemId: string,
  quantity: number,
): NpcTradeQuote | null {
  if (!isNpcVendorSellableItem(itemId)) return null;
  const unitPrice = resolveNpcSellPriceForItem(itemId);
  if (unitPrice === null) return null;
  return resolveQuote(itemId, quantity, unitPrice);
}

function validateTradeSpreadForItem(
  itemId: string,
  listing: NpcVendorListing,
): { readonly ok: true } | { readonly ok: false; readonly reason: string } {
  const buyPrice = resolveEffectiveNpcBuyUnitPrice(itemId, listing);
  const sellPrice = resolveEffectiveNpcSellUnitPrice(itemId, listing);
  if (buyPrice === null || sellPrice === null) {
    return { ok: true };
  }
  return assertValidTradeSpread(buyPrice, sellPrice);
}

export function validateNpcPurchase(params: {
  readonly listing: NpcVendorListing;
  readonly quantity: number;
  readonly walletVolts: number;
}): { readonly ok: true; readonly quote: NpcTradeQuote } | { readonly ok: false; readonly reason: string } {
  const spreadCheck = validateTradeSpreadForItem(params.listing.itemId, params.listing);
  if (!spreadCheck.ok) {
    return spreadCheck;
  }

  const quote = resolveNpcPurchaseQuote(params.listing, params.quantity);
  if (!quote) {
    return { ok: false, reason: 'Item indisponível nesta loja.' };
  }

  if (params.walletVolts < quote.totalVolts) {
    return { ok: false, reason: 'VOLTS insuficientes.' };
  }

  return { ok: true, quote };
}

export function validateNpcSale(params: {
  readonly listing: NpcVendorListing;
  readonly quantity: number;
  readonly inventoryQuantity: number;
}): { readonly ok: true; readonly quote: NpcTradeQuote } | { readonly ok: false; readonly reason: string } {
  const spreadCheck = validateTradeSpreadForItem(params.listing.itemId, params.listing);
  if (!spreadCheck.ok) {
    return spreadCheck;
  }

  const rarityBlock = resolveNpcVendorRarityBlockReason(params.listing.itemId);
  if (rarityBlock) {
    return { ok: false, reason: rarityBlock };
  }

  const quote = resolveNpcSellQuote(params.listing, params.quantity);
  if (!quote) {
    return { ok: false, reason: 'Item indisponível nesta loja.' };
  }

  if (params.inventoryQuantity < quote.quantity) {
    return { ok: false, reason: 'Quantidade insuficiente no inventário.' };
  }

  return { ok: true, quote };
}

export function validateInventoryItemSale(params: {
  readonly itemId: string;
  readonly quantity: number;
  readonly inventoryQuantity: number;
}): { readonly ok: true; readonly quote: NpcTradeQuote } | { readonly ok: false; readonly reason: string } {
  const soulbound = validateSoulboundRetention(params.itemId);
  if (!soulbound.ok) {
    return soulbound;
  }

  const rarityBlock = resolveNpcVendorRarityBlockReason(params.itemId);
  if (rarityBlock) {
    return { ok: false, reason: rarityBlock };
  }

  if (!isNpcVendorSellableItem(params.itemId)) {
    return { ok: false, reason: 'Este item não pode ser vendido ao NPC.' };
  }

  const buyPrice = resolveNpcBuyPriceForItem(params.itemId);
  const sellPrice = resolveNpcSellPriceForItem(params.itemId);
  if (buyPrice !== null && sellPrice !== null) {
    const spreadCheck = assertValidTradeSpread(buyPrice, sellPrice);
    if (!spreadCheck.ok) {
      return spreadCheck;
    }
  }

  const quote = resolveInventoryItemSellQuote(params.itemId, params.quantity);
  if (!quote) {
    return { ok: false, reason: 'Item sem valor de mercado definido.' };
  }

  if (params.inventoryQuantity < quote.quantity) {
    return { ok: false, reason: 'Quantidade insuficiente no inventário.' };
  }

  return { ok: true, quote };
}

/** Preço de revenda (jogador vende ao NPC) — derivado do valorBase × 0.5. */
export function resolveEffectiveNpcSellUnitPrice(itemId: string, listing?: NpcVendorListing): number | null {
  const fromValorBase = resolveNpcSellPriceForItem(itemId);
  if (fromValorBase !== null) return fromValorBase;
  if (listing) return listing.npcSellPriceVolts;
  return null;
}

export function resolveNpcSellSpreadFromValorBase(valorBase: number, buyPrice: number): number {
  return buyPrice - resolveNpcSellPriceFromValorBase(valorBase);
}
