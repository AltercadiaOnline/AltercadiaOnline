import { feedPetSpecialRation } from '../../../Economy/economyGateway.js';
import { BaseIntentHandler } from '../../network/BaseIntentHandler.js';
import { buildPetIntentAckData } from './PetRosterHandlers.js';

export type FeedPetPayload = {
  readonly slotIndex?: number;
};

export class FeedPetHandler extends BaseIntentHandler<FeedPetPayload> {
  readonly actionType = 'PET_FEED_SPECIAL_RATION';

  async execute(playerId: string, payload: FeedPetPayload, intentId: string): Promise<void> {
    const result = await feedPetSpecialRation({
      playerId,
      characterId: this.characterId,
      ...(payload.slotIndex !== undefined ? { slotIndex: payload.slotIndex } : {}),
      intentId,
    });

    if (!result.ok) {
      this.sendResponse(playerId, intentId, false, result.message);
      return;
    }

    this.sendResponse(
      playerId,
      intentId,
      true,
      buildPetIntentAckData(playerId, this.characterId, { message: result.message }),
    );
  }
}

let feedHandler: FeedPetHandler | null = null;

export function getFeedPetHandler(): FeedPetHandler {
  if (!feedHandler) feedHandler = new FeedPetHandler();
  return feedHandler;
}
