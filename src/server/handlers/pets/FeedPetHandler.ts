import { feedPetSpecialRation } from '../../../Economy/economyGateway.js';
import { BaseIntentHandler } from '../../network/BaseIntentHandler.js';

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
      this.sendResponse(playerId, intentId, false, result.code);
      return;
    }

    this.sendResponse(playerId, intentId, true, { message: result.message });
  }
}

let feedHandler: FeedPetHandler | null = null;

export function getFeedPetHandler(): FeedPetHandler {
  if (!feedHandler) feedHandler = new FeedPetHandler();
  return feedHandler;
}
