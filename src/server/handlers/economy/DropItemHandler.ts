// @ts-nocheck
import { dropInventoryItem } from '../../../Economy/economyGateway.js';
import { BaseIntentHandler } from '../../network/BaseIntentHandler.js';
export class DropItemHandler extends BaseIntentHandler {
    actionType = 'DROP_ITEM';
    async execute(playerId, payload, intentId) {
        const result = await dropInventoryItem({
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
            dropId: result.dropId,
            itemId: result.itemId,
            quantity: result.quantity,
        });
    }
}
let handler = null;
export function getDropItemHandler() {
    if (!handler)
        handler = new DropItemHandler();
    return handler;
}
