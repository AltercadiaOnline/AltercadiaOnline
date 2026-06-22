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

export function buildMarketOfferTableView(
  offers: readonly MarketOfferRow[],
  side: MarketOfferSide,
  itemId: string,
  rowCount = MARKET_OFFER_TABLE_ROWS,
): MarketOfferTableView {
  const filtered = filterOffersForItem(offers, itemId);
  const ranked = side === 'sell' ? rankSellOffers(filtered) : rankBuyOffers(filtered);
  const rows = ranked.slice(0, rowCount);
  const paddedRows: Array<MarketOfferRow | null> = [...rows];
  while (paddedRows.length < rowCount) paddedRows.push(null);
  return { rows, paddedRows };
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
