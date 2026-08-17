import { BaseIntentHandler } from '../../network/BaseIntentHandler.js';
import { readLeaderboardSnapshot } from '../../leaderboard/readLeaderboardSnapshot.js';

export type GetLeaderboardPayload = {
  readonly boardId?: string;
  readonly classId?: string;
  readonly limit?: number;
};

export class GetLeaderboardHandler extends BaseIntentHandler<GetLeaderboardPayload> {
  readonly actionType = 'GET_LEADERBOARD';

  async execute(
    playerId: string,
    payload: GetLeaderboardPayload,
    intentId: string,
  ): Promise<void> {
    const snapshot = readLeaderboardSnapshot({
      boardId: payload.boardId,
      classId: payload.classId,
      limit: payload.limit,
    });
    if (!snapshot) {
      this.sendResponse(playerId, intentId, false, 'BOARD_INVALID');
      return;
    }
    this.sendResponse(playerId, intentId, true, snapshot);
  }
}

let handler: GetLeaderboardHandler | null = null;

export function getGetLeaderboardHandler(): GetLeaderboardHandler {
  if (!handler) handler = new GetLeaderboardHandler();
  return handler;
}
