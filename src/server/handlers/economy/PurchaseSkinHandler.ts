import { purchaseSkinAtShop } from '../../../Economy/economyGateway.js';
import type { SkinSlotId } from '../../../shared/character/playerSkin.js';
import { BaseIntentHandler } from '../../network/BaseIntentHandler.js';

export type PurchaseSkinPayload = {
  readonly slot: SkinSlotId;
  readonly optionId: string;
};

export class PurchaseSkinHandler extends BaseIntentHandler<PurchaseSkinPayload> {
  readonly actionType = 'PURCHASE_SKIN';

  async execute(playerId: string, payload: PurchaseSkinPayload, intentId: string): Promise<void> {
    const result = await purchaseSkinAtShop({
      playerId,
      characterId: this.characterId,
      slot: payload.slot,
      optionId: payload.optionId,
      intentId,
    });

    if (!result.ok) {
      this.sendResponse(playerId, intentId, false, result.code);
      return;
    }

    this.sendResponse(playerId, intentId, true, { message: result.message });
  }
}

let handler: PurchaseSkinHandler | null = null;

export function getPurchaseSkinHandler(): PurchaseSkinHandler {
  if (!handler) handler = new PurchaseSkinHandler();
  return handler;
}
