import { BaseIntentHandler } from '../../network/BaseIntentHandler.js';

export type FeedPetPayload = {
  readonly slotIndex?: number;
};

export class FeedPetHandler extends BaseIntentHandler<FeedPetPayload> {
  readonly actionType = 'PET_FEED_SPECIAL_RATION';

  async execute(playerId: string, _payload: FeedPetPayload, intentId: string): Promise<void> {
    this.sendResponse(playerId, intentId, false, 'NOT_IMPLEMENTED');
  }
}

let feedHandler: FeedPetHandler | null = null;

export function getFeedPetHandler(): FeedPetHandler {
  if (!feedHandler) feedHandler = new FeedPetHandler();
  return feedHandler;
}
