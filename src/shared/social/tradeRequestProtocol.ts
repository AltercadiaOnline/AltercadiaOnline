/** Pedido de trade player↔player — janela de troca completa vem depois. */
export type TradeRequestPayload = {
  readonly targetPlayerId: string;
};

export type TradeRequestSuccessData = {
  readonly targetPlayerId: string;
  readonly targetDisplayName: string;
  readonly message: string;
};

export const TRADE_REQUEST_ACTION = 'TRADE_REQUEST' as const;
