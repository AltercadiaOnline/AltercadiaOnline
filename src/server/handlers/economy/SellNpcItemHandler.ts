import { sellNpcItemAtVendor } from '../../../Economy/economyGateway.js';
import { BaseIntentHandler } from '../../network/BaseIntentHandler.js';

export type SellNpcItemPayload = {
  readonly vendorId: string;
  readonly itemId: string;
  readonly quantity: number;
};

export class SellNpcItemHandler extends BaseIntentHandler<SellNpcItemPayload> {
  readonly actionType = 'SELL_NPC_ITEM';

  async execute(
    playerId: string,
    payload: SellNpcItemPayload,
    intentId: string,
  ): Promise<void> {
    const result = await sellNpcItemAtVendor({
      playerId,
      characterId: this.characterId,
      vendorId: payload.vendorId,
      itemId: payload.itemId,
      quantity: payload.quantity,
      intentId,
    });

    if (!result.ok) {
      this.sendResponse(playerId, intentId, false, result.code);
      return;
    }

    this.sendResponse(playerId, intentId, true, {
      itemId: result.itemId,
      quantity: result.quantity,
      totalVolts: result.totalVolts,
    });
  }
}

let handler: SellNpcItemHandler | null = null;

export function getSellNpcItemHandler(): SellNpcItemHandler {
  if (!handler) handler = new SellNpcItemHandler();
  return handler;
}
