// @ts-nocheck
import { finalizeGiftTransferSender, validateGiftTransferRequest, } from '../../../Economy/economyGateway.js';
import { getServerInstanceContext } from '../../instance/ServerInstanceContext.js';
import { executeTransferItem } from '../../supabase/transferItem.js';
import { BaseIntentHandler } from '../../network/BaseIntentHandler.js';
export class GiftTransferHandler extends BaseIntentHandler {
    actionType = 'GIFT_TRANSFER';
    async execute(playerId, payload, intentId) {
        const itemId = payload.itemId.trim();
        const targetPlayerId = payload.targetPlayerId.trim();
        if (!itemId || !targetPlayerId) {
            this.sendResponse(playerId, intentId, false, 'Item ou destinatário inválido.');
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
        const result = await executeTransferItem(playerId, getServerInstanceContext().id, {
            itemId,
            targetPlayerId,
            quantity: policy.quantity,
            characterId: this.characterId,
            ...(payload.targetCharacterId !== undefined
                ? { targetCharacterId: payload.targetCharacterId }
                : {}),
        });
        if (!result.ok) {
            this.sendResponse(playerId, intentId, false, result.message);
            return;
        }
        finalizeGiftTransferSender(playerId, this.characterId, result.data);
        this.sendResponse(playerId, intentId, true, {
            itemId: result.data.itemId,
            quantity: result.data.quantity,
            targetPlayerId: result.data.targetPlayerId,
            senderStacks: result.data.senderStacks,
        });
    }
}
let giftHandler = null;
export function getGiftTransferHandler() {
    if (!giftHandler)
        giftHandler = new GiftTransferHandler();
    return giftHandler;
}
