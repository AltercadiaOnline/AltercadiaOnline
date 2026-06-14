export type TradePriceType = 'BUY' | 'SELL';

/** Jogador compra do NPC — NPC cobra 150% do valor base. */
export const NPC_BUY_PRICE_RATIO = 1.5;

/** Jogador vende ao NPC — NPC paga 50% do valor base. */
export const NPC_SELL_PRICE_RATIO = 0.5;

export function calculateTradePrice(baseValue: number, type: TradePriceType): number {
  if (!Number.isFinite(baseValue) || baseValue <= 0) return 0;
  if (type === 'BUY') return Math.ceil(baseValue * NPC_BUY_PRICE_RATIO);
  return Math.floor(baseValue * NPC_SELL_PRICE_RATIO);
}

export function resolveTradePricesFromBase(baseValue: number): {
  readonly buyPrice: number;
  readonly sellPrice: number;
} {
  return {
    buyPrice: calculateTradePrice(baseValue, 'BUY'),
    sellPrice: calculateTradePrice(baseValue, 'SELL'),
  };
}

/** Bloqueia arbitragem — revenda não pode ser >= preço de compra do NPC. */
export function assertValidTradeSpread(
  buyPrice: number,
  sellPrice: number,
): { readonly ok: true } | { readonly ok: false; readonly reason: string } {
  if (sellPrice >= buyPrice) {
    return {
      ok: false,
      reason: `Margem inválida: revenda (${sellPrice}) não pode ser >= compra (${buyPrice}).`,
    };
  }
  return { ok: true };
}
