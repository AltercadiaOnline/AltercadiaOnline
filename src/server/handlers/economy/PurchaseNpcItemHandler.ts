import { purchaseNpcItemAtVendor } from '../../../Economy/economyGateway.js';
import { BaseIntentHandler } from '../../network/BaseIntentHandler.js';

export type PurchaseNpcItemPayload = {
  readonly vendorId: string;
  readonly itemId: string;
  readonly quantity: number;
};

export class PurchaseNpcItemHandler extends BaseIntentHandler<PurchaseNpcItemPayload> {
  readonly actionType = 'PURCHASE_NPC_ITEM';

  async execute(
    playerId: string,
    payload: PurchaseNpcItemPayload,
    intentId: string,
  ): Promise<void> {
    const result = await purchaseNpcItemAtVendor({
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

let handler: PurchaseNpcItemHandler | null = null;

export function getPurchaseNpcItemHandler(): PurchaseNpcItemHandler {
  if (!handler) handler = new PurchaseNpcItemHandler();
  return handler;
}
