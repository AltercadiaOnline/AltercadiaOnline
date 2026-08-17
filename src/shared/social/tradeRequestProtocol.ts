/** Pedido de trade player↔player — janela de troca completa vem depois. */
export type TradeRequestPayload = {
  readonly targetPlayerId: string;
  readonly targetCharacterId: number;
};

export type TradeRequestSuccessData = {
  readonly targetPlayerId: string;
  readonly targetDisplayName: string;
  readonly message: string;
  readonly tradeId?: string;
};

export const TRADE_REQUEST_ACTION = 'TRADE_REQUEST' as const;
