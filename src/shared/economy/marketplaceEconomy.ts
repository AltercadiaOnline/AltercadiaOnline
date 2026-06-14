/** Taxa fixa do terminal Marketplace sobre vendas P2P (processamento da transação). */
export const MARKETPLACE_SALE_FEE_RATIO = 0.1;

/** Janela de transações para calcular preço médio de mercado. */
export const MARKET_AVERAGE_TRANSACTION_SAMPLE = 10;

export function resolveMarketplaceFeeFromGross(grossVolts: number): number {
  const gross = Math.max(0, Math.floor(grossVolts));
  return Math.floor(gross * MARKETPLACE_SALE_FEE_RATIO);
}

/** Volts líquidos recebidos pelo vendedor após taxa do terminal. */
export function resolveMarketplaceNetFromGross(grossVolts: number): number {
  const gross = Math.max(0, Math.floor(grossVolts));
  return Math.max(1, gross - resolveMarketplaceFeeFromGross(gross));
}

export function resolveMarketplaceNetUnitPrice(listingUnitPrice: number, quantity: number): number {
  const qty = Math.max(1, Math.floor(quantity));
  const grossTotal = Math.max(1, Math.floor(listingUnitPrice)) * qty;
  return Math.floor(resolveMarketplaceNetFromGross(grossTotal) / qty);
}

export function formatMarketplaceFeePercent(): string {
  return `${Math.round(MARKETPLACE_SALE_FEE_RATIO * 100)}%`;
}
