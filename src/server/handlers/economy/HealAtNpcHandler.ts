import { applyHealAtNpc } from '../../world/NpcHealGateway.js';
import { BaseIntentHandler } from '../../network/BaseIntentHandler.js';

export type HealAtNpcPayload = {
  readonly npcId: string;
};

export class HealAtNpcHandler extends BaseIntentHandler<HealAtNpcPayload> {
  readonly actionType = 'HEAL_AT_NPC';

  async execute(
    playerId: string,
    payload: HealAtNpcPayload,
    intentId: string,
  ): Promise<void> {
    const result = await applyHealAtNpc({
      playerId,
      characterId: this.characterId,
      npcId: payload.npcId,
      intentId,
    });

    if (!result.ok) {
      this.sendResponse(playerId, intentId, false, result.message);
      return;
    }

    this.sendResponse(playerId, intentId, true);
  }
}

let handler: HealAtNpcHandler | null = null;

export function getHealAtNpcHandler(): HealAtNpcHandler {
  if (!handler) handler = new HealAtNpcHandler();
  return handler;
}
