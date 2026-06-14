import { BaseIntentHandler } from '../../network/BaseIntentHandler.js';

/**
 * EXCHANGE_ALTER_FOR_VOLTS — rota dedicada economy-exchange-alter no WS hoje.
 */
export class ExchangeAlterHandler extends BaseIntentHandler<{ readonly alterAmount: number }> {
  readonly actionType = 'EXCHANGE_ALTER_FOR_VOLTS';

  async execute(playerId: string, _payload: { readonly alterAmount: number }, intentId: string): Promise<void> {
    this.sendResponse(playerId, intentId, false, 'USE_EXCHANGE_CHANNEL');
  }
}

let handler: ExchangeAlterHandler | null = null;

export function getExchangeAlterHandler(): ExchangeAlterHandler {
  if (!handler) handler = new ExchangeAlterHandler();
  return handler;
}
