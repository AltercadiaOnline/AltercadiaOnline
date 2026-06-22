import { globalEventBus } from './EventBus.js';
import { EconomyEventType } from '../shared/economy/events.js';
import { buildSeedMarketOffers, type MarketOfferRow } from '../shared/economy/marketplaceOrderBook.js';
import { formatVolts } from '../shared/economy/premiumCurrency.js';
import { isMarketplaceListableItem } from '../shared/economy/itemValorEconomy.js';
import { validateSoulboundRetention } from '../shared/economy/soulboundInventoryPolicy.js';
import { resolveMarketplaceNetFromGross } from '../shared/economy/marketplaceEconomy.js';
import { equippedToEquipmentUiGrid } from '../shared/character/equipmentUiSlots.js';
import { computeInventoryChecksumFromStacks } from '../shared/character/inventoryChecksum.js';
import { getItemById } from '../shared/items/itemCatalog.js';
import { assertDeleteItemAllowed } from './InventoryService.js';
import {
  executeEconomyTransaction,
  getAuthoritativePlayerLoadout,
  getCharacterInventoryStacks,
  getCharacterProfile,
  getPlayerWallet,
  syncAuthoritativeLoadoutFromEconomyProfile,
} from './economyStore.js';
import {
  listGlobalMarketListings,
  registerGlobalMarketListing,
  unregisterGlobalMarketListing,
  getGlobalMarketListing,
} from './globalMarketplaceStore.js';
import {
  addMarketplaceBuyOrder,
  addMarketplaceListing,
  cancelMarketplaceBuyOrder,
  cancelMarketplaceListing,
  collectMarketplaceListing,
  getMarketplaceBuyOrders,
  getMarketplaceListings,
  markMarketplaceListingSold,
  type MarketplaceBuyOrderRecord,
  type MarketplaceListingRecord,
} from './marketplaceStore.js';

export type MarketplaceMutationResult =
  | { readonly ok: true; readonly message: string }
  | { readonly ok: false; readonly message: string };

export type MarketplacePurchaseResult =
  | {
    readonly ok: true;
    readonly message: string;
    readonly sellerPlayerId: string;
    readonly sellerCharacterId: number;
  }
  | { readonly ok: false; readonly message: string };

function buildMarketOffers(
  playerId: string,
  characterId: number,
): readonly MarketOfferRow[] {
  const sellOffers: MarketOfferRow[] = getMarketplaceListings(playerId, characterId)
    .filter((entry) => entry.status === 'LISTED')
    .map((listing) => ({
      id: `own_sell_${listing.id}`,
      itemId: listing.itemId,
      displayName: 'Você',
      quantity: listing.quantity,
      unitPriceVolts: listing.unitPriceVolts,
      totalPriceVolts: listing.totalPriceVolts,
      side: 'sell' as const,
      anonymous: listing.anonymous ?? false,
      isOwn: true,
    }));

  const peerSellOffers: MarketOfferRow[] = listGlobalMarketListings()
    .filter((listing) => (
      listing.sellerPlayerId !== playerId || listing.sellerCharacterId !== characterId
    ))
    .map((listing) => ({
      id: `p2p_sell_${listing.id}`,
      itemId: listing.itemId,
      displayName: listing.anonymous ? 'Anônimo' : 'Mercador',
      quantity: listing.quantity,
      unitPriceVolts: listing.unitPriceVolts,
      totalPriceVolts: listing.totalPriceVolts,
      side: 'sell' as const,
      anonymous: listing.anonymous ?? false,
      isOwn: false,
    }));

  const buyOffers: MarketOfferRow[] = getMarketplaceBuyOrders(playerId, characterId)
    .map((order) => ({
      id: `own_buy_${order.id}`,
      itemId: order.itemId,
      displayName: 'Você',
      quantity: order.quantity,
      unitPriceVolts: order.unitPriceVolts,
      totalPriceVolts: order.totalPriceVolts,
      side: 'buy' as const,
      anonymous: order.anonymous,
      isOwn: true,
    }));

  return [...buildSeedMarketOffers(), ...peerSellOffers, ...sellOffers, ...buyOffers];
}
function emitMarketplaceUpdated(
  playerId: string,
  characterId: number,
  options?: { readonly intentId?: string; readonly message?: string },
): void {
  const revision = Date.now();
  globalEventBus.emit({
    type: EconomyEventType.MarketplaceUpdated,
    payload: {
      playerId,
      characterId,
      offers: buildMarketOffers(playerId, characterId),
      ownListings: getMarketplaceListings(playerId, characterId),
      ownBuyOrders: getMarketplaceBuyOrders(playerId, characterId),
      revision,
      ...(options?.intentId ? { intentId: options.intentId } : {}),
      ...(options?.message ? { message: options.message } : {}),
    },
  });
}

function countInventoryItem(playerId: string, characterId: number, itemId: string): number {
  return getCharacterInventoryStacks(playerId, characterId)
    .filter((stack) => stack.itemId === itemId)
    .reduce((sum, stack) => sum + stack.quantity, 0);
}

function buildInventoryUpdatedPayload(
  playerId: string,
  characterId: number,
  items: readonly import('../shared/character/equipmentState.js').InventoryStack[],
  extras?: { readonly intentId?: string; readonly revision?: number },
) {
  const profile = getCharacterProfile(playerId, characterId);
  const loadout = getAuthoritativePlayerLoadout(playerId, characterId);
  const equipmentUiGrid = loadout?.equipmentUiGrid
    ?? profile.equipmentUiGrid
    ?? equippedToEquipmentUiGrid(profile.equipped);
  const equipped = loadout?.equipped ?? profile.equipped;

  return {
    playerId,
    characterId,
    items: items.map((row) => ({ ...row })),
    equipped,
    equipmentUiGrid,
    inventoryChecksum: computeInventoryChecksumFromStacks(items),
    revision: extras?.revision ?? Date.now(),
    ...(extras?.intentId ? { intentId: extras.intentId } : {}),
  };
}

export async function createMarketListingAuthoritative(
  playerId: string,
  characterId: number,
  itemId: string,
  quantity: number,
  unitPriceVolts: number,
  anonymous: boolean,
  intentId?: string,
): Promise<MarketplaceMutationResult> {
  const soulbound = validateSoulboundRetention(itemId);
  if (!soulbound.ok) return { ok: false, message: soulbound.reason };

  if (!isMarketplaceListableItem(itemId)) {
    return { ok: false, message: 'Este item não pode ser anunciado no Marketplace.' };
  }

  const qty = Math.max(1, Math.floor(quantity));
  const unitPrice = Math.max(1, Math.floor(unitPriceVolts));
  if (countInventoryItem(playerId, characterId, itemId) < qty) {
    return { ok: false, message: 'Quantidade insuficiente no inventário.' };
  }

  try {
    assertDeleteItemAllowed(itemId);
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : 'Item não pode ser listado.' };
  }

  const tx = await executeEconomyTransaction(playerId, characterId, (store) => {
    store.removeInventoryItem(itemId, qty);
  });

  if (!tx.ok) {
    return { ok: false, message: tx.message };
  }

  syncAuthoritativeLoadoutFromEconomyProfile(playerId, characterId);
  const listing = addMarketplaceListing(
    playerId,
    characterId,
    itemId,
    qty,
    unitPrice,
    anonymous,
  );

  registerGlobalMarketListing({
    ...listing,
    sellerPlayerId: playerId,
    sellerCharacterId: characterId,
  });
  const revision = Date.now();
  const item = getItemById(itemId);
  const message = `Oferta de venda publicada: ${qty}× ${item?.name ?? itemId} por ${unitPrice} V.`;

  globalEventBus.emit({
    type: EconomyEventType.InventoryUpdated,
    payload: buildInventoryUpdatedPayload(
      playerId,
      characterId,
      tx.inventorySnapshot,
      { revision, ...(intentId ? { intentId } : {}) },
    ),
  });

  emitMarketplaceUpdated(playerId, characterId, {
    ...(intentId ? { intentId } : {}),
    message,
  });
  return { ok: true, message };
}

export async function createMarketBuyOrderAuthoritative(
  playerId: string,
  characterId: number,
  itemId: string,
  quantity: number,
  unitPriceVolts: number,
  anonymous: boolean,
  intentId?: string,
): Promise<MarketplaceMutationResult> {
  if (!isMarketplaceListableItem(itemId)) {
    return { ok: false, message: 'Este item não pode ser alvo de ordem de compra.' };
  }

  const qty = Math.max(1, Math.floor(quantity));
  const unitPrice = Math.max(1, Math.floor(unitPriceVolts));
  const totalCost = qty * unitPrice;

  const tx = await executeEconomyTransaction(playerId, characterId, (store) => {
    store.spendDollarVolt(totalCost);
  });

  if (!tx.ok) {
    return { ok: false, message: 'VOLTS insuficientes para reservar a ordem de compra.' };
  }

  const item = getItemById(itemId);
  addMarketplaceBuyOrder(playerId, characterId, itemId, qty, unitPrice, anonymous);

  const revision = Date.now();
  const message = `Ordem de compra publicada: ${qty}× ${item?.name ?? itemId} até ${unitPrice} V/un.`;

  globalEventBus.emit({
    type: EconomyEventType.WalletUpdated,
    payload: {
      playerId,
      dollarVolt: tx.walletBalance,
      alterCoins: tx.alterCoins,
      revision,
      ...(intentId ? { intentId } : {}),
    },
  });

  emitMarketplaceUpdated(playerId, characterId, {
    ...(intentId ? { intentId } : {}),
    message,
  });
  return { ok: true, message };
}

export async function collectMarketVoltsAuthoritative(
  playerId: string,
  characterId: number,
  listingId: string,
  intentId?: string,
): Promise<MarketplaceMutationResult> {
  const collected = collectMarketplaceListing(playerId, characterId, listingId);
  if (!collected.ok) return { ok: false, message: collected.reason };

  const netVolts = resolveMarketplaceNetFromGross(collected.volts);
  const tx = await executeEconomyTransaction(playerId, characterId, (store) => {
    store.addDollarVolt(netVolts);
  });

  if (!tx.ok) {
    return { ok: false, message: tx.message };
  }

  const revision = Date.now();
  const message = `Venda coletada: +${formatVolts(netVolts)}.`;

  globalEventBus.emit({
    type: EconomyEventType.WalletUpdated,
    payload: {
      playerId,
      dollarVolt: tx.walletBalance,
      alterCoins: tx.alterCoins,
      revision,
      ...(intentId ? { intentId } : {}),
    },
  });

  emitMarketplaceUpdated(playerId, characterId, {
    ...(intentId ? { intentId } : {}),
    message,
  });
  return { ok: true, message };
}

export async function cancelMarketListingAuthoritative(
  playerId: string,
  characterId: number,
  listingId: string,
  intentId?: string,
): Promise<MarketplaceMutationResult> {
  const cancelled = cancelMarketplaceListing(playerId, characterId, listingId);
  if (!cancelled.ok) return { ok: false, message: cancelled.reason };

  unregisterGlobalMarketListing(listingId);
  const tx = await executeEconomyTransaction(playerId, characterId, (store) => {
    store.addInventoryItem(cancelled.itemId, cancelled.quantity);
  });

  if (!tx.ok) {
    return { ok: false, message: tx.message };
  }

  syncAuthoritativeLoadoutFromEconomyProfile(playerId, characterId);
  const revision = Date.now();
  const message = `Oferta de venda cancelada: ${cancelled.quantity}× ${cancelled.itemName} devolvido(s).`;

  globalEventBus.emit({
    type: EconomyEventType.InventoryUpdated,
    payload: buildInventoryUpdatedPayload(
      playerId,
      characterId,
      tx.inventorySnapshot,
      { revision, ...(intentId ? { intentId } : {}) },
    ),
  });

  emitMarketplaceUpdated(playerId, characterId, {
    ...(intentId ? { intentId } : {}),
    message,
  });
  return { ok: true, message };
}

export async function cancelMarketBuyOrderAuthoritative(
  playerId: string,
  characterId: number,
  orderId: string,
  intentId?: string,
): Promise<MarketplaceMutationResult> {
  const cancelled = cancelMarketplaceBuyOrder(playerId, characterId, orderId);
  if (!cancelled.ok) return { ok: false, message: cancelled.reason };

  const tx = await executeEconomyTransaction(playerId, characterId, (store) => {
    store.addDollarVolt(cancelled.refundVolts);
  });

  if (!tx.ok) {
    return { ok: false, message: tx.message };
  }

  const revision = Date.now();
  const message = `Ordem de compra cancelada: ${formatVolts(cancelled.refundVolts)} devolvidos.`;

  globalEventBus.emit({
    type: EconomyEventType.WalletUpdated,
    payload: {
      playerId,
      dollarVolt: tx.walletBalance,
      alterCoins: tx.alterCoins,
      revision,
      ...(intentId ? { intentId } : {}),
    },
  });

  emitMarketplaceUpdated(playerId, characterId, {
    ...(intentId ? { intentId } : {}),
    message,
  });
  return { ok: true, message };
}

export async function executeMarketPurchaseAuthoritative(
  buyerPlayerId: string,
  buyerCharacterId: number,
  listingId: string,
  intentId?: string,
): Promise<MarketplacePurchaseResult> {
  const globalListing = getGlobalMarketListing(listingId);
  if (!globalListing || globalListing.status !== 'LISTED') {
    return { ok: false, message: 'Anúncio indisponível ou já vendido.' };
  }

  const { sellerPlayerId, sellerCharacterId } = globalListing;
  if (sellerPlayerId === buyerPlayerId && sellerCharacterId === buyerCharacterId) {
    return { ok: false, message: 'Não é possível comprar sua própria oferta.' };
  }

  const buyerWallet = getPlayerWallet(buyerPlayerId);
  if (buyerWallet.dollarVolt < globalListing.totalPriceVolts) {
    return { ok: false, message: 'VOLTS insuficientes para esta compra.' };
  }

  const sold = markMarketplaceListingSold(sellerPlayerId, sellerCharacterId, listingId);
  if (!sold) {
    return { ok: false, message: 'Anúncio indisponível ou já vendido.' };
  }

  unregisterGlobalMarketListing(listingId);

  const tx = await executeEconomyTransaction(buyerPlayerId, buyerCharacterId, (store) => {
    store.spendDollarVolt(globalListing.totalPriceVolts);
    store.addInventoryItem(globalListing.itemId, globalListing.quantity);
  });

  if (!tx.ok) {
    return { ok: false, message: tx.message };
  }

  syncAuthoritativeLoadoutFromEconomyProfile(buyerPlayerId, buyerCharacterId);

  const revision = Date.now();
  const item = getItemById(globalListing.itemId);
  const message = `Compra concluída: ${globalListing.quantity}× ${item?.name ?? globalListing.itemId}.`;

  globalEventBus.emit({
    type: EconomyEventType.WalletUpdated,
    payload: {
      playerId: buyerPlayerId,
      dollarVolt: tx.walletBalance,
      alterCoins: tx.alterCoins,
      revision,
      ...(intentId ? { intentId } : {}),
    },
  });

  globalEventBus.emit({
    type: EconomyEventType.InventoryUpdated,
    payload: buildInventoryUpdatedPayload(
      buyerPlayerId,
      buyerCharacterId,
      tx.inventorySnapshot,
      { revision, ...(intentId ? { intentId } : {}) },
    ),
  });

  emitMarketplaceUpdated(buyerPlayerId, buyerCharacterId, {
    ...(intentId ? { intentId } : {}),
    message,
  });

  emitMarketplaceUpdated(sellerPlayerId, sellerCharacterId, {
    message: 'Sua oferta foi vendida — colete os VOLTS no terminal.',
  });

  return {
    ok: true,
    message,
    sellerPlayerId,
    sellerCharacterId,
  };
}

export type { MarketplaceListingRecord, MarketplaceBuyOrderRecord };