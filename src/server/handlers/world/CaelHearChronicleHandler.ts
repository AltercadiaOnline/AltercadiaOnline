import { isAnciaoCaelNpc } from '../../../shared/economy/caelPetService.js';
import { hearNextCaelChronicle } from '../../../shared/world/caelChronicleBook.js';
import { validateHealNpcProximity } from '../../../shared/world/npcHealAccessPolicy.js';
import { BaseIntentHandler } from '../../network/BaseIntentHandler.js';
import { getWorldProfile } from '../../world/worldProfileStore.js';
import {
  getCaelChronicleProgress,
  setCaelChronicleProgress,
} from '../../world/caelChronicleStore.js';

export type CaelHearChroniclePayload = {
  readonly npcId: string;
};

export class CaelHearChronicleHandler extends BaseIntentHandler<CaelHearChroniclePayload> {
  readonly actionType = 'CAEL_HEAR_CHRONICLE';

  async execute(
    playerId: string,
    payload: CaelHearChroniclePayload,
    intentId: string,
  ): Promise<void> {
    const npcId = typeof payload.npcId === 'string' ? payload.npcId.trim() : '';
    if (!isAnciaoCaelNpc(npcId)) {
      this.sendResponse(playerId, intentId, false, 'Somente o Ancião Cael lê este tomo.');
      return;
    }

    const profile = getWorldProfile(playerId, this.characterId);
    const proximity = validateHealNpcProximity({
      mapId: profile.currentMapId,
      worldX: profile.lastPosition.x,
      worldY: profile.lastPosition.y,
      npcId,
    });
    if (!proximity.ok) {
      this.sendResponse(playerId, intentId, false, proximity.message);
      return;
    }

    const current = getCaelChronicleProgress(playerId, this.characterId);
    const heard = hearNextCaelChronicle(current);
    if (!heard.ok) {
      this.sendResponse(playerId, intentId, false, heard.message);
      return;
    }

    const progress = setCaelChronicleProgress(playerId, this.characterId, heard.progress);
    this.sendResponse(playerId, intentId, true, {
      caelChronicles: progress,
      heardChapterId: heard.chapter.id,
    });
  }
}

let handler: CaelHearChronicleHandler | null = null;

export function getCaelHearChronicleHandler(): CaelHearChronicleHandler {
  if (!handler) handler = new CaelHearChronicleHandler();
  return handler;
}
