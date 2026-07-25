// @ts-nocheck
import { clampMoveMasteryXp, MOVE_MAX_LEVEL, totalMasteryXpForLevel, } from '../../../shared/progression/moveProgression.js';
import { devGrantCurrency, devGrantInventoryItem, devResetPlayerEconomy, } from '../../../Economy/economyGateway.js';
import { patchAuthoritativeProgression, loadAuthoritativeProgression, getAuthoritativeProgression } from '../../progression/authoritativeProgressionStore.js';
import { createDefaultPlayerProgressionData } from '../../../shared/progression/playerProgressionData.js';
import { BaseIntentHandler } from '../../network/BaseIntentHandler.js';
import { loadServerEnv } from '../../config/env.js';
function assertDevCheatsAllowed() {
    const env = loadServerEnv();
    if (env.nodeEnv === 'production') {
        return 'DEV_CHEATS_DISABLED';
    }
    return null;
}
export class DevGrantItemHandler extends BaseIntentHandler {
    actionType = 'DEV_GRANT_ITEM';
    async execute(playerId, payload, intentId) {
        const blocked = assertDevCheatsAllowed();
        if (blocked) {
            this.sendResponse(playerId, intentId, false, blocked);
            return;
        }
        const result = await devGrantInventoryItem({
            playerId,
            characterId: this.characterId,
            itemId: payload.itemId,
            ...(payload.quantity !== undefined ? { quantity: payload.quantity } : {}),
            intentId,
        });
        if (!result.ok) {
            this.sendResponse(playerId, intentId, false, result.message);
            return;
        }
        this.sendResponse(playerId, intentId, true, { added: result.added, itemId: payload.itemId });
    }
}
export class DevGrantCurrencyHandler extends BaseIntentHandler {
    actionType = 'DEV_GRANT_CURRENCY';
    async execute(playerId, payload, intentId) {
        const blocked = assertDevCheatsAllowed();
        if (blocked) {
            this.sendResponse(playerId, intentId, false, blocked);
            return;
        }
        const result = await devGrantCurrency({
            playerId,
            characterId: this.characterId,
            ...(payload.volts !== undefined ? { volts: payload.volts } : {}),
            ...(payload.alterCoins !== undefined ? { alterCoins: payload.alterCoins } : {}),
            intentId,
        });
        if (!result.ok) {
            this.sendResponse(playerId, intentId, false, result.message);
            return;
        }
        this.sendResponse(playerId, intentId, true);
    }
}
export class DevSetLevelHandler extends BaseIntentHandler {
    actionType = 'DEV_SET_LEVEL';
    async execute(playerId, payload, intentId) {
        const blocked = assertDevCheatsAllowed();
        if (blocked) {
            this.sendResponse(playerId, intentId, false, blocked);
            return;
        }
        const level = Math.max(1, Math.min(999, Math.floor(payload.level)));
        patchAuthoritativeProgression(playerId, this.characterId, {
            characterProfile: { level, xpCurrent: 0 },
        });
        this.sendResponse(playerId, intentId, true, { level });
    }
}
export class DevResetPlayerHandler extends BaseIntentHandler {
    actionType = 'DEV_RESET_PLAYER';
    async execute(playerId, _payload, intentId) {
        const blocked = assertDevCheatsAllowed();
        if (blocked) {
            this.sendResponse(playerId, intentId, false, blocked);
            return;
        }
        const result = await devResetPlayerEconomy({
            playerId,
            characterId: this.characterId,
            intentId,
        });
        if (!result.ok) {
            this.sendResponse(playerId, intentId, false, result.message);
            return;
        }
        patchAuthoritativeProgression(playerId, this.characterId, {
            characterProfile: { level: 1, xpCurrent: 0 },
        });
        const current = getAuthoritativeProgression(playerId, this.characterId);
        loadAuthoritativeProgression(playerId, this.characterId, {
            progression: createDefaultPlayerProgressionData(),
            marcos: current.marcos,
            characterProfile: { level: 1, xpCurrent: 0 },
        });
        this.sendResponse(playerId, intentId, true);
    }
}
export class DevSetMovesetMasteryHandler extends BaseIntentHandler {
    actionType = 'DEV_SET_MOVESET_MASTERY';
    async execute(playerId, payload, intentId) {
        const blocked = assertDevCheatsAllowed();
        if (blocked) {
            this.sendResponse(playerId, intentId, false, blocked);
            return;
        }
        const moveId = typeof payload.moveId === 'string' ? payload.moveId.trim() : '';
        if (!moveId) {
            this.sendResponse(playerId, intentId, false, 'MOVE_ID_REQUIRED');
            return;
        }
        const level = Math.max(1, Math.min(MOVE_MAX_LEVEL, Math.floor(payload.level)));
        const masteryXp = clampMoveMasteryXp(totalMasteryXpForLevel(level));
        patchAuthoritativeProgression(playerId, this.characterId, {
            progression: {
                movesetMastery: { [moveId]: masteryXp },
            },
        });
        const updated = getAuthoritativeProgression(playerId, this.characterId);
        this.sendResponse(playerId, intentId, true, {
            moveId,
            level,
            masteryXp,
            movesetMastery: updated.progression.movesetMastery,
        });
    }
}
let grantItemHandler = null;
let grantCurrencyHandler = null;
let setLevelHandler = null;
let setMovesetMasteryHandler = null;
let resetPlayerHandler = null;
export function getDevGrantItemHandler() {
    if (!grantItemHandler)
        grantItemHandler = new DevGrantItemHandler();
    return grantItemHandler;
}
export function getDevGrantCurrencyHandler() {
    if (!grantCurrencyHandler)
        grantCurrencyHandler = new DevGrantCurrencyHandler();
    return grantCurrencyHandler;
}
export function getDevSetLevelHandler() {
    if (!setLevelHandler)
        setLevelHandler = new DevSetLevelHandler();
    return setLevelHandler;
}
export function getDevSetMovesetMasteryHandler() {
    if (!setMovesetMasteryHandler)
        setMovesetMasteryHandler = new DevSetMovesetMasteryHandler();
    return setMovesetMasteryHandler;
}
export function getDevResetPlayerHandler() {
    if (!resetPlayerHandler)
        resetPlayerHandler = new DevResetPlayerHandler();
    return resetPlayerHandler;
}
