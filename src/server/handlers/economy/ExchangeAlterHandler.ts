import { exchangeAlterCoinsForVolts } from '../../../Economy/economyGateway.js';
import { BaseIntentHandler } from '../../network/BaseIntentHandler.js';

export class ExchangeAlterHandler extends BaseIntentHandler<{ readonly alterAmount: number }> {
  readonly actionType = 'EXCHANGE_ALTER_FOR_VOLTS';

  async execute(
    playerId: string,
    payload: { readonly alterAmount: number },
    intentId: string,
  ): Promise<void> {
    const result = await exchangeAlterCoinsForVolts({
      playerId,
      characterId: this.characterId,
      alterAmount: payload.alterAmount,
      intentId,
    });

    if (!result.ok) {
      this.sendResponse(playerId, intentId, false, result.message);
      return;
    }

    this.sendResponse(playerId, intentId, true, {
      alterSpent: result.payload.alterSpent,
      voltsReceived: result.payload.voltsReceived,
    });
  }
}

let handler: ExchangeAlterHandler | null = null;

export function getExchangeAlterHandler(): ExchangeAlterHandler {
  if (!handler) handler = new ExchangeAlterHandler();
  return handler;
}
