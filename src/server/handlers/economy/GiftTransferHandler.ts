import {
  commitAuthoritativeGiftTransfer,
  validateGiftTransferRequest,
} from '../../../Economy/economyGateway.js';
import { BaseIntentHandler } from '../../network/BaseIntentHandler.js';
import { getWorldGameState } from '../../world/WorldGameState.js';

export type GiftTransferPayload = {
  readonly itemId: string;
  readonly targetPlayerId: string;
  readonly quantity?: number;
  readonly targetCharacterId: number;
};

export class GiftTransferHandler extends BaseIntentHandler<GiftTransferPayload> {
  readonly actionType = 'GIFT_TRANSFER';

  async execute(playerId: string, payload: GiftTransferPayload, intentId: string): Promise<void> {
    const itemId = payload.itemId.trim();
    const targetPlayerId = payload.targetPlayerId.trim();
    const targetCharacterId = Number(payload.targetCharacterId);
    if (!itemId || !targetPlayerId || !Number.isInteger(targetCharacterId) || targetCharacterId < 1) {
      this.sendResponse(playerId, intentId, false, 'Item ou destinatário inválido.');
      return;
    }

    const targetWorld = getWorldGameState().getByPlayer(targetPlayerId, targetCharacterId);
    if (!targetWorld || targetWorld.status !== 'exploring') {
      this.sendResponse(playerId, intentId, false, 'Destinatário precisa estar no mundo.');
      return;
    }

    const policy = validateGiftTransferRequest({
      senderPlayerId: playerId,
      senderCharacterId: this.characterId,
      itemId,
      ...(payload.quantity !== undefined ? { quantity: payload.quantity } : {}),
    });
    if (!policy.ok) {
      this.sendResponse(playerId, intentId, false, policy.message);
      return;
    }

    const result = await commitAuthoritativeGiftTransfer({
      senderPlayerId: playerId,
      senderCharacterId: this.characterId,
      targetPlayerId,
      targetCharacterId,
      itemId,
      quantity: policy.quantity,
      intentId,
    });

    if (!result.ok) {
      this.sendResponse(playerId, intentId, false, result.message);
      return;
    }

    this.sendResponse(playerId, intentId, true, {
      itemId: result.data.itemId,
      quantity: result.data.quantity,
      targetPlayerId: result.data.targetPlayerId,
      senderStacks: result.data.senderStacks,
    });
  }
}

let giftHandler: GiftTransferHandler | null = null;

export function getGiftTransferHandler(): GiftTransferHandler {
  if (!giftHandler) giftHandler = new GiftTransferHandler();
  return giftHandler;
}
