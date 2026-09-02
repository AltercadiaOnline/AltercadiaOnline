import {
  advanceMercenaryQuestStep,
  type MercenaryQuestInteractRequest,
} from '../../../shared/quests/mercenaryQuestStepEngine.js';
import {
  grantMercenaryQuestItem,
} from '../../../Economy/economyGateway.js';
import { BaseIntentHandler } from '../../network/BaseIntentHandler.js';
import {
  getMercenaryQuestProgress,
  setMercenaryQuestProgress,
} from '../../quests/mercenaryQuestStore.js';
import { getWorldProfile } from '../../world/worldProfileStore.js';
import { isMapId } from '../../../shared/world/mapRegistry.js';
import { assertMercenaryQuestNpcInRange } from '../../../shared/quests/mercenaryQuestInteractRange.js';

export type MercenaryQuestInteractPayload = MercenaryQuestInteractRequest;

export class MercenaryQuestInteractHandler extends BaseIntentHandler<MercenaryQuestInteractPayload> {
  readonly actionType = 'MERCENARY_QUEST_INTERACT';

  async execute(
    playerId: string,
    payload: MercenaryQuestInteractPayload,
    intentId: string,
  ): Promise<void> {
    const targetId = payload.targetId?.trim();
    const mapId = payload.mapId;
    const targetKind = payload.targetKind;
    if (!targetId || !mapId || !targetKind) {
      this.sendResponse(playerId, intentId, false, 'QUEST_INTERACT_INVALID');
      return;
    }

    if (targetKind === 'npc') {
      if (!isMapId(mapId)) {
        this.sendResponse(playerId, intentId, false, 'QUEST_INTERACT_INVALID');
        return;
      }
      const profile = getWorldProfile(playerId, this.characterId);
      if (!isMapId(profile.currentMapId)) {
        this.sendResponse(playerId, intentId, false, 'QUEST_MAP_MISMATCH');
        return;
      }
      const range = assertMercenaryQuestNpcInRange(targetId, mapId, {
        mapId: profile.currentMapId,
        x: profile.lastPosition.x,
        y: profile.lastPosition.y,
      });
      if (!range.ok) {
        this.sendResponse(playerId, intentId, false, range.code);
        return;
      }
    }

    const current = getMercenaryQuestProgress(playerId, this.characterId);
    const result = advanceMercenaryQuestStep(current, {
      targetKind,
      targetId,
      mapId,
    });
    if (!result.ok) {
      this.sendResponse(playerId, intentId, false, result.code);
      return;
    }

    if (result.grantsItem) {
      const grant = await grantMercenaryQuestItem({
        playerId,
        characterId: this.characterId,
        itemId: result.grantsItem,
        intentId,
      });
      if (!grant.ok) {
        this.sendResponse(playerId, intentId, false, grant.message);
        return;
      }
    }

    const progress = setMercenaryQuestProgress(playerId, this.characterId, result.progress);
    this.sendResponse(playerId, intentId, true, {
      mercenaryQuests: progress,
      objectiveShort: result.objectiveShort,
      ...(result.grantsItem ? { grantedItemId: result.grantsItem } : {}),
    });
  }
}

let interactHandler: MercenaryQuestInteractHandler | null = null;

export function getMercenaryQuestInteractHandler(): MercenaryQuestInteractHandler {
  if (!interactHandler) interactHandler = new MercenaryQuestInteractHandler();
  return interactHandler;
}
