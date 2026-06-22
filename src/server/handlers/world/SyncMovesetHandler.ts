import { BaseIntentHandler } from '../../network/BaseIntentHandler.js';
import { applyAuthoritativeMovesetSync } from '../../world/movesetGateway.js';

export type SyncMovesetPayload = {
  readonly activeMovesets: readonly string[];
};

export class SyncMovesetHandler extends BaseIntentHandler<SyncMovesetPayload> {
  readonly actionType = 'SYNC_MOVESET';

  async execute(playerId: string, payload: SyncMovesetPayload, intentId: string): Promise<void> {
    const result = applyAuthoritativeMovesetSync(
      playerId,
      this.characterId,
      payload.activeMovesets ?? [],
    );
    if (!result.ok) {
      this.sendResponse(playerId, intentId, false, result.message);
      return;
    }
    this.sendResponse(playerId, intentId, true, {
      activeMovesets: [...result.activeMovesets],
    });
  }
}

let syncMovesetHandler: SyncMovesetHandler | null = null;

export function getSyncMovesetHandler(): SyncMovesetHandler {
  if (!syncMovesetHandler) syncMovesetHandler = new SyncMovesetHandler();
  return syncMovesetHandler;
}
