import { deleteInventoryItem } from '../../../Economy/economyGateway.js';
import { BaseIntentHandler } from '../../network/BaseIntentHandler.js';

export type DeleteItemPayload = {
  readonly itemId: string;
  readonly quantity?: number;
  readonly slotIndex?: number;
};

export class DeleteItemHandler extends BaseIntentHandler<DeleteItemPayload> {
  readonly actionType = 'DELETE_ITEM';

  async execute(
    playerId: string,
    payload: DeleteItemPayload,
    intentId: string,
  ): Promise<void> {
    const result = await deleteInventoryItem({
      playerId,
      characterId: this.characterId,
      itemId: payload.itemId,
      ...(payload.quantity !== undefined ? { quantity: payload.quantity } : {}),
      ...(payload.slotIndex !== undefined ? { slotIndex: payload.slotIndex } : {}),
      intentId,
    });

    if (!result.ok) {
      this.sendResponse(playerId, intentId, false, result.code);
      return;
    }

    this.sendResponse(playerId, intentId, true, {
      itemId: result.itemId,
      quantity: result.quantity,
    });
  }
}

let handler: DeleteItemHandler | null = null;

export function getDeleteItemHandler(): DeleteItemHandler {
  if (!handler) handler = new DeleteItemHandler();
  return handler;
}
