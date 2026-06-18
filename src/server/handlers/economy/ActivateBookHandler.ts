import { activateBook } from '../../../Economy/economyGateway.js';
import { BaseIntentHandler } from '../../network/BaseIntentHandler.js';

export type ActivateBookPayload = {
  readonly bookId: string;
};

export class ActivateBookHandler extends BaseIntentHandler<ActivateBookPayload> {
  readonly actionType = 'ACTIVATE_BOOK';

  async execute(
    playerId: string,
    payload: ActivateBookPayload,
    intentId: string,
  ): Promise<void> {
    const bookId = payload.bookId?.trim();
    if (!bookId) {
      this.sendResponse(playerId, intentId, false, 'BOOK_ID_REQUIRED');
      return;
    }

    const result = await activateBook({
      playerId,
      characterId: this.characterId,
      bookId,
    });

    if (!result.ok) {
      this.sendResponse(playerId, intentId, false, result.message);
      return;
    }

    this.sendResponse(playerId, intentId, true, {
      bookId,
      expiresAt: result.expiresAt,
    });
  }
}

let handler: ActivateBookHandler | null = null;

export function getActivateBookHandler(): ActivateBookHandler {
  if (!handler) handler = new ActivateBookHandler();
  return handler;
}
