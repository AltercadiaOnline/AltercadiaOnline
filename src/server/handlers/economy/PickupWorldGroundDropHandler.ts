// @ts-nocheck
import { pickupWorldGroundDrop } from '../../../Economy/economyGateway.js';
import { BaseIntentHandler } from '../../network/BaseIntentHandler.js';
export class PickupWorldGroundDropHandler extends BaseIntentHandler {
    actionType = 'PICKUP_WORLD_DROP';
    async execute(playerId, payload, intentId) {
        const result = await pickupWorldGroundDrop({
            playerId,
            characterId: this.characterId,
            dropId: payload.dropId,
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
let handler = null;
export function getPickupWorldGroundDropHandler() {
    if (!handler)
        handler = new PickupWorldGroundDropHandler();
    return handler;
}
