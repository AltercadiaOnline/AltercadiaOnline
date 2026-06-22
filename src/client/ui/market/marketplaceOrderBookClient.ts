import {
  buildSeedMarketOffers,
  type MarketOfferRow,
} from '../../../shared/economy/marketplaceOrderBook.js';
import { getPlayerMarketStore, type PlayerMarketListing } from './playerMarketStore.js';
import { getMarketplaceBuyOrderStore, type MarketplaceBuyOrder } from './marketplaceBuyOrderStore.js';

function listingToSellOffer(listing: PlayerMarketListing): MarketOfferRow {
  return {
    id: `own_sell_${listing.id}`,
    itemId: listing.itemId,
    displayName: 'Você',
    quantity: listing.quantity,
    unitPriceVolts: listing.unitPriceVolts,
    totalPriceVolts: listing.totalPriceVolts,
    side: 'sell',
    anonymous: listing.anonymous ?? false,
    isOwn: true,
  };
}

function buyOrderToOffer(order: MarketplaceBuyOrder): MarketOfferRow {
  return {
    id: `own_buy_${order.id}`,
    itemId: order.itemId,
    displayName: 'Você',
    quantity: order.quantity,
    unitPriceVolts: order.unitPriceVolts,
    totalPriceVolts: order.totalPriceVolts,
    side: 'buy',
    anonymous: order.anonymous,
    isOwn: true,
  };
}

let cachedSeed: readonly MarketOfferRow[] | null = null;

function getSeedOffers(): readonly MarketOfferRow[] {
  if (!cachedSeed) cachedSeed = buildSeedMarketOffers();
  return cachedSeed;
}

let authoritativeOffers: readonly MarketOfferRow[] | null = null;
const authoritativeListeners = new Set<() => void>();

/** Sync order book autoritativo (servidor online). */
export function applyAuthoritativeMarketplaceOffers(offers: readonly MarketOfferRow[]): void {
  authoritativeOffers = offers.map((row) => ({ ...row }));
  for (const listener of authoritativeListeners) listener();
}

export function clearAuthoritativeMarketplaceOffers(): void {
  authoritativeOffers = null;
}

/** Snapshot local do livro de ofertas (seed + anúncios do jogador). */
export function getMarketplaceOrderBookSnapshot(): readonly MarketOfferRow[] {
  if (authoritativeOffers) {
    return authoritativeOffers.map((row) => ({ ...row }));
  }
  const sellListings = getPlayerMarketStore()
    .getListings()
    .filter((entry) => entry.status === 'LISTED')
    .map(listingToSellOffer);

  const buyOrders = getMarketplaceBuyOrderStore()
    .getOrders()
    .map(buyOrderToOffer);

  return [...getSeedOffers(), ...sellListings, ...buyOrders];
}

export function subscribeMarketplaceOrderBook(listener: () => void): () => void {
  authoritativeListeners.add(listener);
  const unsubSell = getPlayerMarketStore().subscribe(() => listener());
  const unsubBuy = getMarketplaceBuyOrderStore().subscribe(() => listener());
  return () => {
    authoritativeListeners.delete(listener);
    unsubSell();
    unsubBuy();
  };
}

export function resolveOwnMarketOfferRef(offerId: string):
  | { readonly side: 'sell'; readonly listingId: string }
  | { readonly side: 'buy'; readonly orderId: string }
  | null {
  if (offerId.startsWith('own_sell_')) {
    return { side: 'sell', listingId: offerId.slice('own_sell_'.length) };
  }
  if (offerId.startsWith('own_buy_')) {
    return { side: 'buy', orderId: offerId.slice('own_buy_'.length) };
  }
  return null;
}

export function resolveP2pMarketOfferRef(offerId: string): { readonly listingId: string } | null {
  if (!offerId.startsWith('p2p_sell_')) return null;
  return { listingId: offerId.slice('p2p_sell_'.length) };
}
