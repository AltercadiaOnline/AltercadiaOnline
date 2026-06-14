import {
  MARKET_AVERAGE_TRANSACTION_SAMPLE,
  resolveMarketplaceNetFromGross,
} from './marketplaceEconomy.js';
import {
  resolveItemValorBase,
  resolveNpcSellPriceFromValorBase,
} from './itemValorEconomy.js';

export type MarketTransactionRecord = {
  readonly itemId: string;
  readonly unitPriceVolts: number;
  readonly quantity: number;
  readonly completedAtMs: number;
};

export type MarketAverageQuote = {
  readonly itemId: string;
  readonly averageUnitPrice: number;
  readonly sampleSize: number;
  readonly usedValorBaseFallback: boolean;
};

const transactions: MarketTransactionRecord[] = [];

/** Seed autoritativo — simula histórico recente do servidor para sugestão de preço. */
const SEED_TRANSACTIONS: readonly MarketTransactionRecord[] = [
  { itemId: 'soul_fragment', unitPriceVolts: 44, quantity: 2, completedAtMs: 1 },
  { itemId: 'soul_fragment', unitPriceVolts: 46, quantity: 1, completedAtMs: 2 },
  { itemId: 'soul_fragment', unitPriceVolts: 45, quantity: 3, completedAtMs: 3 },
  { itemId: 'soul_fragment', unitPriceVolts: 47, quantity: 1, completedAtMs: 4 },
  { itemId: 'soul_fragment', unitPriceVolts: 43, quantity: 2, completedAtMs: 5 },
  { itemId: 'soul_fragment', unitPriceVolts: 48, quantity: 1, completedAtMs: 6 },
  { itemId: 'soul_fragment', unitPriceVolts: 45, quantity: 4, completedAtMs: 7 },
  { itemId: 'soul_fragment', unitPriceVolts: 44, quantity: 1, completedAtMs: 8 },
  { itemId: 'soul_fragment', unitPriceVolts: 46, quantity: 2, completedAtMs: 9 },
  { itemId: 'soul_fragment', unitPriceVolts: 45, quantity: 1, completedAtMs: 10 },
  { itemId: 'dimensional_rock', unitPriceVolts: 210, quantity: 1, completedAtMs: 11 },
  { itemId: 'dimensional_rock', unitPriceVolts: 215, quantity: 1, completedAtMs: 12 },
  { itemId: 'dimensional_rock', unitPriceVolts: 220, quantity: 1, completedAtMs: 13 },
  { itemId: 'dimensional_rock', unitPriceVolts: 218, quantity: 2, completedAtMs: 14 },
  { itemId: 'dimensional_rock', unitPriceVolts: 225, quantity: 1, completedAtMs: 15 },
  { itemId: 'bones', unitPriceVolts: 6, quantity: 5, completedAtMs: 16 },
  { itemId: 'bones', unitPriceVolts: 7, quantity: 3, completedAtMs: 17 },
  { itemId: 'bones', unitPriceVolts: 8, quantity: 2, completedAtMs: 18 },
  { itemId: 'wraith_echo', unitPriceVolts: 258, quantity: 1, completedAtMs: 19 },
  { itemId: 'wraith_echo', unitPriceVolts: 265, quantity: 1, completedAtMs: 20 },
];

let seeded = false;

function ensureSeeded(): void {
  if (seeded) return;
  seeded = true;
  transactions.push(...SEED_TRANSACTIONS);
}

/** Registra venda P2P concluída — alimenta preço médio (servidor/mock). */
export function recordMarketplaceTransaction(record: Omit<MarketTransactionRecord, 'completedAtMs'>): void {
  ensureSeeded();
  transactions.push({
    ...record,
    completedAtMs: Date.now(),
  });
}

export function getRecentMarketTransactions(itemId: string, limit = MARKET_AVERAGE_TRANSACTION_SAMPLE): readonly MarketTransactionRecord[] {
  ensureSeeded();
  const matches: MarketTransactionRecord[] = [];
  for (let index = transactions.length - 1; index >= 0 && matches.length < limit; index -= 1) {
    const row = transactions[index];
    if (row?.itemId === itemId) matches.push(row);
  }
  return matches.reverse();
}

/** Preço médio das últimas N transações do servidor; fallback para valorBase. */
export function resolveMarketAverageUnitPrice(itemId: string): MarketAverageQuote {
  ensureSeeded();
  const valorBase = resolveItemValorBase(itemId);
  const recent = getRecentMarketTransactions(itemId);

  if (recent.length === 0) {
    return {
      itemId,
      averageUnitPrice: valorBase ?? 0,
      sampleSize: 0,
      usedValorBaseFallback: valorBase !== null,
    };
  }

  const total = recent.reduce((sum, row) => sum + row.unitPriceVolts, 0);
  const averageUnitPrice = Math.round(total / recent.length);

  return {
    itemId,
    averageUnitPrice,
    sampleSize: recent.length,
    usedValorBaseFallback: false,
  };
}

export type MarketListingComparison = {
  readonly itemId: string;
  readonly quantity: number;
  readonly valorBase: number | null;
  readonly marketAverageUnitPrice: number;
  readonly marketAverageSampleSize: number;
  readonly listingUnitPrice: number;
  readonly npcQuickSellTotal: number;
  readonly marketplaceEstimatedNetTotal: number;
  readonly marketplaceNetUnitPrice: number;
};

/** Comparativo NPC vs Marketplace — exibido na criação de anúncio. */
export function resolveMarketListingComparison(params: {
  readonly itemId: string;
  readonly listingUnitPrice: number;
  readonly quantity?: number;
}): MarketListingComparison | null {
  const valorBase = resolveItemValorBase(params.itemId);
  if (valorBase === null) return null;

  const quantity = Math.max(1, Math.floor(params.quantity ?? 1));
  const listingUnitPrice = Math.max(1, Math.floor(params.listingUnitPrice));
  const average = resolveMarketAverageUnitPrice(params.itemId);

  const estimateUnit = average.averageUnitPrice > 0 ? average.averageUnitPrice : valorBase;
  const grossEstimateTotal = estimateUnit * quantity;
  const grossListingTotal = listingUnitPrice * quantity;

  return {
    itemId: params.itemId,
    quantity,
    valorBase,
    marketAverageUnitPrice: average.averageUnitPrice,
    marketAverageSampleSize: average.sampleSize,
    listingUnitPrice,
    npcQuickSellTotal: resolveNpcSellPriceFromValorBase(valorBase) * quantity,
    marketplaceEstimatedNetTotal: resolveMarketplaceNetFromGross(grossEstimateTotal),
    marketplaceNetUnitPrice: Math.floor(resolveMarketplaceNetFromGross(grossListingTotal) / quantity),
  };
}
