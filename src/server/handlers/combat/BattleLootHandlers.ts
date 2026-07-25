// @ts-nocheck
import { collectBattleLoot, dismissBattleLoot, } from '../../../Economy/economyGateway.js';
import { peekPendingLoot } from '../../../Economy/pendingLootStore.js';
import { persistPendingLootSnapshot } from '../../persistence/PersistenceGateway.js';
import { BaseIntentHandler } from '../../network/BaseIntentHandler.js';
export class CollectBattleLootHandler extends BaseIntentHandler {
    actionType = 'COLLECT_BATTLE_LOOT';
    async execute(playerId, payload, intentId) {
        const result = await collectBattleLoot({
            lootId: payload.lootId,
            winnerId: playerId,
            characterId: this.characterId,
        });
        if (!result.ok) {
            this.sendResponse(playerId, intentId, false, result.message);
            return;
        }
        await persistPendingLootSnapshot();
        this.sendResponse(playerId, intentId, true, {
            lootId: payload.lootId,
            battleId: payload.battleId,
            ...(result.discardedQuantity !== undefined && result.discardedQuantity > 0
                ? { discardedQuantity: result.discardedQuantity }
                : {}),
        });
    }
}
export class DismissBattleLootHandler extends BaseIntentHandler {
    actionType = 'DISMISS_BATTLE_LOOT';
    async execute(playerId, payload, intentId) {
        const pending = peekPendingLoot(payload.lootId);
        if (pending) {
            if (pending.winnerId !== playerId || pending.characterId !== this.characterId) {
                this.sendResponse(playerId, intentId, false, 'Saque não pertence a este personagem.');
                return;
            }
        }
        dismissBattleLoot(payload.lootId);
        await persistPendingLootSnapshot();
        this.sendResponse(playerId, intentId, true);
    }
}
let collectHandler = null;
let dismissHandler = null;
export function getCollectBattleLootHandler() {
    if (!collectHandler)
        collectHandler = new CollectBattleLootHandler();
    return collectHandler;
}
export function getDismissBattleLootHandler() {
    if (!dismissHandler)
        dismissHandler = new DismissBattleLootHandler();
    return dismissHandler;
}
