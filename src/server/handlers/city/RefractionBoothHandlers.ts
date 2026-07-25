// @ts-nocheck
import { getRefractionBoothService } from '../../city/RefractionBoothService.js';
import { BaseIntentHandler } from '../../network/BaseIntentHandler.js';
export class RefractionBoothQuoteHandler extends BaseIntentHandler {
    actionType = 'REFRACTION_BOOTH_QUOTE';
    async execute(playerId, _payload, intentId) {
        const result = getRefractionBoothService().getQuote({
            playerId,
            characterId: this.characterId,
        });
        if (!result.ok) {
            this.sendResponse(playerId, intentId, false, result.reason);
            return;
        }
        this.sendResponse(playerId, intentId, true, result);
    }
}
export class RefractionBoothStartHandler extends BaseIntentHandler {
    actionType = 'REFRACTION_BOOTH_START';
    async execute(playerId, payload, intentId) {
        const result = await getRefractionBoothService().startSession({
            playerId,
            characterId: this.characterId,
            displayName: payload.displayName,
        });
        if (!result.ok) {
            this.sendResponse(playerId, intentId, false, result.reason);
            return;
        }
        this.sendResponse(playerId, intentId, true, result);
    }
}
export class RefractionBoothCompleteHandler extends BaseIntentHandler {
    actionType = 'REFRACTION_BOOTH_COMPLETE';
    async execute(playerId, payload, intentId) {
        const result = await getRefractionBoothService().completeSession({
            playerId,
            characterId: this.characterId,
            payload,
        });
        if (!result.ok) {
            this.sendResponse(playerId, intentId, false, result.reason);
            return;
        }
        this.sendResponse(playerId, intentId, true, result);
    }
}
let quoteHandler = null;
let startHandler = null;
let completeHandler = null;
export function getRefractionBoothQuoteHandler() {
    if (!quoteHandler)
        quoteHandler = new RefractionBoothQuoteHandler();
    return quoteHandler;
}
export function getRefractionBoothStartHandler() {
    if (!startHandler)
        startHandler = new RefractionBoothStartHandler();
    return startHandler;
}
export function getRefractionBoothCompleteHandler() {
    if (!completeHandler)
        completeHandler = new RefractionBoothCompleteHandler();
    return completeHandler;
}
