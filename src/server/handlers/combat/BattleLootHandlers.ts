import {
  collectBattleLoot,
  dismissBattleLoot,
} from '../../../Economy/economyGateway.js';
import { peekPendingLoot } from '../../../Economy/pendingLootStore.js';
import { persistPendingLootSnapshot } from '../../persistence/PersistenceGateway.js';
import { BaseIntentHandler } from '../../network/BaseIntentHandler.js';

export type CollectBattleLootPayload = {
  readonly lootId: string;
  readonly battleId: string;
};

export type DismissBattleLootPayload = {
  readonly lootId: string;
};

export class CollectBattleLootHandler extends BaseIntentHandler<CollectBattleLootPayload> {
  readonly actionType = 'COLLECT_BATTLE_LOOT';

  async execute(playerId: string, payload: CollectBattleLootPayload, intentId: string): Promise<void> {
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

export class DismissBattleLootHandler extends BaseIntentHandler<DismissBattleLootPayload> {
  readonly actionType = 'DISMISS_BATTLE_LOOT';

  async execute(playerId: string, payload: DismissBattleLootPayload, intentId: string): Promise<void> {
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

let collectHandler: CollectBattleLootHandler | null = null;
let dismissHandler: DismissBattleLootHandler | null = null;

export function getCollectBattleLootHandler(): CollectBattleLootHandler {
  if (!collectHandler) collectHandler = new CollectBattleLootHandler();
  return collectHandler;
}

export function getDismissBattleLootHandler(): DismissBattleLootHandler {
  if (!dismissHandler) dismissHandler = new DismissBattleLootHandler();
  return dismissHandler;
}
