import { craftItemAtStation } from '../../../Economy/economyGateway.js';
import { BaseIntentHandler } from '../../network/BaseIntentHandler.js';

export type CraftItemPayload = {
  readonly craftStationId: string;
  readonly recipeId: string;
  readonly quantity?: number;
};

export class CraftItemHandler extends BaseIntentHandler<CraftItemPayload> {
  readonly actionType = 'CRAFT_ITEM';

  async execute(playerId: string, payload: CraftItemPayload, intentId: string): Promise<void> {
    const quantity = Math.max(1, Math.floor(payload.quantity ?? 1));

    const result = await craftItemAtStation({
      playerId,
      characterId: this.characterId,
      craftStationId: payload.craftStationId,
      recipeId: payload.recipeId,
      quantity,
      intentId,
    });

    if (!result.ok) {
      this.sendResponse(playerId, intentId, false, result.code);
      return;
    }

    this.sendResponse(playerId, intentId, true, {
      recipeId: payload.recipeId,
      outputItemId: result.outputItemId,
      outputQuantity: result.outputQuantity,
      batches: result.batches,
    });
  }
}

let craftHandler: CraftItemHandler | null = null;

export function getCraftItemHandler(): CraftItemHandler {
  if (!craftHandler) craftHandler = new CraftItemHandler();
  return craftHandler;
}
