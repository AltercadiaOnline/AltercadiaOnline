import { getAuthoritativeItemById } from '../items/itemCatalogAuthoritative.js';
import {
  ItemRegistry,
  MarketBrowseCategory,
  type MarketBrowseCategoryId,
  type MarketBrowseItem,
} from '../items/ItemRegistry.js';
import { resolveMarketAverageUnitPrice } from './marketTransactionHistory.js';
import { formatVoltsShort } from './premiumCurrency.js';

/** Linhas fixas por tabela — HUD sem scroll. */
export const MARKET_OFFER_TABLE_ROWS = 5;

export type MarketOfferSide = 'sell' | 'buy';

export type MarketOfferRow = {
  readonly id: string;
  readonly itemId: string;
  readonly displayName: string;
  readonly quantity: number;
  readonly unitPriceVolts: number;
  readonly totalPriceVolts: number;
  readonly side: MarketOfferSide;
  readonly anonymous: boolean;
  readonly isOwn?: boolean;
};

export { MarketBrowseCategory, type MarketBrowseCategoryId, type MarketBrowseItem };

export type MarketOfferTableView = {
  readonly rows: readonly MarketOfferRow[];
  readonly paddedRows: readonly (MarketOfferRow | null)[];
};

export function getMarketBrowseCategoryLabels(): ReadonlyArray<{
  readonly id: MarketBrowseCategoryId;
  readonly label: string;
  readonly count: number;
}> {
  return ItemRegistry.getMarketBrowseCategoryLabels();
}

export function listMarketBrowseItems(
  categoryId: MarketBrowseCategoryId,
  searchQuery = '',
): readonly MarketBrowseItem[] {
  return ItemRegistry.listMarketBrowseItems(categoryId, searchQuery);
}
export function resolveMarketOfferDisplayName(
  offer: Pick<MarketOfferRow, 'displayName' | 'anonymous'>,
): string {
  return offer.anonymous ? 'Anônimo' : offer.displayName;
}

/** Sell: menor preço unitário primeiro (melhor para comprador). */
export function rankSellOffers(offers: readonly MarketOfferRow[]): MarketOfferRow[] {
  return [...offers]
    .filter((row) => row.side === 'sell')
    .sort((a, b) => {
      if (a.unitPriceVolts !== b.unitPriceVolts) return a.unitPriceVolts - b.unitPriceVolts;
      if (a.totalPriceVolts !== b.totalPriceVolts) return a.totalPriceVolts - b.totalPriceVolts;
      return a.id.localeCompare(b.id);
    });
}

/** Buy: maior preço unitário primeiro (melhor para vendedor). */
export function rankBuyOffers(offers: readonly MarketOfferRow[]): MarketOfferRow[] {
  return [...offers]
    .filter((row) => row.side === 'buy')
    .sort((a, b) => {
      if (a.unitPriceVolts !== b.unitPriceVolts) return b.unitPriceVolts - a.unitPriceVolts;
      if (a.totalPriceVolts !== b.totalPriceVolts) return b.totalPriceVolts - a.totalPriceVolts;
      return a.id.localeCompare(b.id);
    });
}

export function filterOffersForItem(
  offers: readonly MarketOfferRow[],
  itemId: string,
): readonly MarketOfferRow[] {
  return offers.filter((row) => row.itemId === itemId);
}

export function resolveMarketOfferItemLabel(itemId: string): string {
  return getAuthoritativeItemById(itemId)?.name ?? itemId;
}

export function buildMarketOfferTableView(
  offers: readonly MarketOfferRow[],
  side: MarketOfferSide,
  itemId: string | null,
  rowCount = MARKET_OFFER_TABLE_ROWS,
): MarketOfferTableView {
  const filtered = itemId ? filterOffersForItem(offers, itemId) : offers;
  const ranked = side === 'sell' ? rankSellOffers(filtered) : rankBuyOffers(filtered);
  const rows = itemId
    ? pinOwnOffersWithinRowLimit(ranked, side, rowCount)
    : ranked.slice(0, Math.max(rowCount, ranked.length));
  const paddedRows: Array<MarketOfferRow | null> = [...rows];
  if (paddedRows.length === 0) {
    paddedRows.push(null);
  }
  return { rows, paddedRows };
}

/** Ofertas próprias do item nunca caem do recorte de 5 linhas. */
function pinOwnOffersWithinRowLimit(
  ranked: readonly MarketOfferRow[],
  side: MarketOfferSide,
  rowCount: number,
): MarketOfferRow[] {
  const own = ranked.filter((row) => row.isOwn);
  const others = ranked.filter((row) => !row.isOwn);
  const otherSlots = Math.max(0, rowCount - own.length);
  const merged = [...own, ...others.slice(0, otherSlots)];
  return side === 'sell' ? rankSellOffers(merged) : rankBuyOffers(merged);
}

export function formatMarketVolts(value: number): string {
  return formatVoltsShort(Math.max(0, Math.floor(value)));
}

export function resolveMarketAverageLabel(itemId: string): string {
  const quote = resolveMarketAverageUnitPrice(itemId);
  if (quote.sampleSize > 0) {
    return `Média (${quote.sampleSize} vendas): ${formatMarketVolts(quote.averageUnitPrice)}`;
  }
  const item = getAuthoritativeItemById(itemId);
  return item?.valorBase
    ? `Referência base: ${formatMarketVolts(item.valorBase)}`
    : 'Sem histórico de mercado';
}

/** Ofertas simuladas do servidor — MVP até sync autoritativo. */
export function buildSeedMarketOffers(): readonly MarketOfferRow[] {
  const seeds: Array<Omit<MarketOfferRow, 'id' | 'totalPriceVolts'>> = [
    { itemId: 'soul_fragment', displayName: 'Kira_Volt', quantity: 12, unitPriceVolts: 36, side: 'sell', anonymous: false },
    { itemId: 'soul_fragment', displayName: 'Mercador_X', quantity: 8, unitPriceVolts: 38, side: 'sell', anonymous: true },
    { itemId: 'soul_fragment', displayName: 'NovaTrade', quantity: 20, unitPriceVolts: 40, side: 'sell', anonymous: false },
    { itemId: 'soul_fragment', displayName: 'Comprador_A', quantity: 15, unitPriceVolts: 34, side: 'buy', anonymous: false },
    { itemId: 'soul_fragment', displayName: 'Loteiro', quantity: 30, unitPriceVolts: 33, side: 'buy', anonymous: true },
    { itemId: 'dimensional_rock', displayName: 'RiftCo', quantity: 2, unitPriceVolts: 98, side: 'sell', anonymous: false },
    { itemId: 'dimensional_rock', displayName: 'Anon', quantity: 1, unitPriceVolts: 105, side: 'sell', anonymous: true },
    { itemId: 'dimensional_rock', displayName: 'Coletor_Z', quantity: 3, unitPriceVolts: 110, side: 'buy', anonymous: false },
    { itemId: 'bones', displayName: 'Ossario', quantity: 40, unitPriceVolts: 9, side: 'sell', anonymous: false },
    { itemId: 'bones', displayName: 'BulkBuy', quantity: 50, unitPriceVolts: 8, side: 'buy', anonymous: true },
    { itemId: 'wraith_echo', displayName: 'EchoHub', quantity: 1, unitPriceVolts: 115, side: 'sell', anonymous: false },
    { itemId: 'wraith_echo', displayName: 'PhantomBid', quantity: 2, unitPriceVolts: 120, side: 'buy', anonymous: false },
    { itemId: 'bat_wing', displayName: 'WingMart', quantity: 24, unitPriceVolts: 6, side: 'sell', anonymous: false },
    { itemId: 'bat_wing', displayName: 'FlyBuy', quantity: 18, unitPriceVolts: 5, side: 'buy', anonymous: true },
  ];

  return seeds.map((seed, index) => ({
    ...seed,
    id: `seed_${seed.side}_${seed.itemId}_${index}`,
    totalPriceVolts: seed.quantity * seed.unitPriceVolts,
  }));
}

export type MarketplaceListingOfferSource = {
  readonly id: string;
  readonly itemId: string;
  readonly quantity: number;
  readonly unitPriceVolts: number;
  readonly totalPriceVolts: number;
  readonly anonymous?: boolean;
  readonly status?: 'LISTED' | 'SOLD';
  readonly sellerPlayerId?: string;
  readonly sellerCharacterId?: number;
};

export type MarketplaceBuyOrderOfferSource = {
  readonly id: string;
  readonly itemId: string;
  readonly quantity: number;
  readonly unitPriceVolts: number;
  readonly totalPriceVolts: number;
  readonly anonymous: boolean;
};

export type MarketplaceOwnListingRow = {
  readonly id: string;
  readonly itemId: string;
  readonly itemName: string;
  readonly quantity: number;
  readonly unitPriceVolts: number;
  readonly totalPriceVolts: number;
  readonly status: 'LISTED' | 'SOLD';
  readonly anonymous?: boolean;
  readonly createdAt: number;
  readonly soldAt?: number;
};

export type MarketplaceOwnBuyOrderRow = {
  readonly id: string;
  readonly itemId: string;
  readonly itemName: string;
  readonly quantity: number;
  readonly unitPriceVolts: number;
  readonly totalPriceVolts: number;
  readonly anonymous: boolean;
  readonly createdAt: number;
};

export type MarketplaceOrderBookSnapshot = {
  readonly offers: readonly MarketOfferRow[];
  readonly ownListings: readonly MarketplaceOwnListingRow[];
  readonly ownBuyOrders: readonly MarketplaceOwnBuyOrderRow[];
  readonly itemId?: string | null;
};

function toSellOfferRow(
  listing: MarketplaceListingOfferSource,
  isOwn: boolean,
): MarketOfferRow {
  return {
    id: isOwn ? `own_sell_${listing.id}` : `p2p_sell_${listing.id}`,
    itemId: listing.itemId,
    displayName: isOwn ? 'Você' : (listing.anonymous ? 'Anônimo' : 'Mercador'),
    quantity: listing.quantity,
    unitPriceVolts: listing.unitPriceVolts,
    totalPriceVolts: listing.totalPriceVolts,
    side: 'sell',
    anonymous: listing.anonymous ?? false,
    isOwn,
  };
}

/**
 * Livro público: global (inclui a oferta do próprio viewer, mesmo offline) + anúncios
 * só-locais ainda não espelhados + ordens de compra próprias.
 */
export function composeMarketplaceOffers(input: {
  readonly viewerPlayerId: string;
  readonly viewerCharacterId: number;
  readonly globalListings: readonly MarketplaceListingOfferSource[];
  readonly ownListings: readonly MarketplaceListingOfferSource[];
  readonly ownBuyOrders: readonly MarketplaceBuyOrderOfferSource[];
  readonly includeSeeds?: boolean;
}): MarketOfferRow[] {
  const globalIds = new Set(input.globalListings.map((row) => row.id));
  const fromGlobal = input.globalListings
    .filter((row) => row.status !== 'SOLD')
    .map((listing) => {
      const isOwn = listing.sellerPlayerId === input.viewerPlayerId
        && listing.sellerCharacterId === input.viewerCharacterId;
      return toSellOfferRow(listing, isOwn);
    });

  const ownOnly = input.ownListings
    .filter((row) => row.status !== 'SOLD' && !globalIds.has(row.id))
    .map((listing) => toSellOfferRow(listing, true));

  const buyOffers: MarketOfferRow[] = input.ownBuyOrders.map((order) => ({
    id: `own_buy_${order.id}`,
    itemId: order.itemId,
    displayName: 'Você',
    quantity: order.quantity,
    unitPriceVolts: order.unitPriceVolts,
    totalPriceVolts: order.totalPriceVolts,
    side: 'buy',
    anonymous: order.anonymous,
    isOwn: true,
  }));

  const seeds = input.includeSeeds === false ? [] : [...buildSeedMarketOffers()];
  return [...seeds, ...fromGlobal, ...ownOnly, ...buyOffers];
}

export function filterMarketplaceOffersByItem(
  offers: readonly MarketOfferRow[],
  itemId: string | null | undefined,
): readonly MarketOfferRow[] {
  if (!itemId) return offers;
  return filterOffersForItem(offers, itemId);
}

function isMarketOfferSide(value: unknown): value is MarketOfferSide {
  return value === 'sell' || value === 'buy';
}

function parseMarketOfferRow(value: unknown): MarketOfferRow | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  if (typeof record.id !== 'string' || record.id.length === 0) return null;
  if (typeof record.itemId !== 'string' || record.itemId.length === 0) return null;
  if (typeof record.displayName !== 'string') return null;
  if (typeof record.quantity !== 'number' || !Number.isFinite(record.quantity)) return null;
  if (typeof record.unitPriceVolts !== 'number' || !Number.isFinite(record.unitPriceVolts)) return null;
  if (typeof record.totalPriceVolts !== 'number' || !Number.isFinite(record.totalPriceVolts)) return null;
  if (!isMarketOfferSide(record.side)) return null;
  if (typeof record.anonymous !== 'boolean') return null;
  return {
    id: record.id,
    itemId: record.itemId,
    displayName: record.displayName,
    quantity: record.quantity,
    unitPriceVolts: record.unitPriceVolts,
    totalPriceVolts: record.totalPriceVolts,
    side: record.side,
    anonymous: record.anonymous,
    ...(record.isOwn === true ? { isOwn: true } : {}),
  };
}

function parseOwnListingRow(value: unknown): MarketplaceOwnListingRow | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  if (typeof record.id !== 'string' || typeof record.itemId !== 'string') return null;
  if (typeof record.itemName !== 'string') return null;
  if (typeof record.quantity !== 'number' || typeof record.unitPriceVolts !== 'number') return null;
  if (typeof record.totalPriceVolts !== 'number' || typeof record.createdAt !== 'number') return null;
  if (record.status !== 'LISTED' && record.status !== 'SOLD') return null;
  return {
    id: record.id,
    itemId: record.itemId,
    itemName: record.itemName,
    quantity: record.quantity,
    unitPriceVolts: record.unitPriceVolts,
    totalPriceVolts: record.totalPriceVolts,
    status: record.status,
    createdAt: record.createdAt,
    ...(typeof record.anonymous === 'boolean' ? { anonymous: record.anonymous } : {}),
    ...(typeof record.soldAt === 'number' ? { soldAt: record.soldAt } : {}),
  };
}

function parseOwnBuyOrderRow(value: unknown): MarketplaceOwnBuyOrderRow | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  if (typeof record.id !== 'string' || typeof record.itemId !== 'string') return null;
  if (typeof record.itemName !== 'string') return null;
  if (typeof record.quantity !== 'number' || typeof record.unitPriceVolts !== 'number') return null;
  if (typeof record.totalPriceVolts !== 'number' || typeof record.createdAt !== 'number') return null;
  if (typeof record.anonymous !== 'boolean') return null;
  return {
    id: record.id,
    itemId: record.itemId,
    itemName: record.itemName,
    quantity: record.quantity,
    unitPriceVolts: record.unitPriceVolts,
    totalPriceVolts: record.totalPriceVolts,
    anonymous: record.anonymous,
    createdAt: record.createdAt,
  };
}

export function parseMarketplaceOrderBookSnapshot(data: unknown): MarketplaceOrderBookSnapshot | null {
  if (!data || typeof data !== 'object') return null;
  const record = data as Record<string, unknown>;
  if (!Array.isArray(record.offers) || !Array.isArray(record.ownListings) || !Array.isArray(record.ownBuyOrders)) {
    return null;
  }

  const offers: MarketOfferRow[] = [];
  for (const row of record.offers) {
    const parsed = parseMarketOfferRow(row);
    if (!parsed) return null;
    offers.push(parsed);
  }

  const ownListings = record.ownListings
    .map(parseOwnListingRow)
    .filter((row): row is MarketplaceOwnListingRow => row !== null);
  const ownBuyOrders = record.ownBuyOrders
    .map(parseOwnBuyOrderRow)
    .filter((row): row is MarketplaceOwnBuyOrderRow => row !== null);
  const itemId = typeof record.itemId === 'string' && record.itemId.length > 0
    ? record.itemId
    : null;

  return { offers, ownListings, ownBuyOrders, itemId };
}
