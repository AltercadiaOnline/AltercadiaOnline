import { buyCaelPetRationAtNpc } from '../../../Economy/economyGateway.js';
import { BaseIntentHandler } from '../../network/BaseIntentHandler.js';
import { buildPetIntentAckData } from '../pets/PetRosterHandlers.js';

export type CaelBuyPetRationPayload = {
  readonly npcId: string;
};

export class CaelBuyPetRationHandler extends BaseIntentHandler<CaelBuyPetRationPayload> {
  readonly actionType = 'CAEL_BUY_PET_RATION';

  async execute(
    playerId: string,
    payload: CaelBuyPetRationPayload,
    intentId: string,
  ): Promise<void> {
    const result = await buyCaelPetRationAtNpc({
      playerId,
      characterId: this.characterId,
      npcId: payload.npcId,
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
      buildPetIntentAckData(playerId, this.characterId, {
        chargesGranted: result.chargesGranted,
        rationCharges: result.totalRationCharges,
      }),
    );
  }
}

let handler: CaelBuyPetRationHandler | null = null;

export function getCaelBuyPetRationHandler(): CaelBuyPetRationHandler {
  if (!handler) handler = new CaelBuyPetRationHandler();
  return handler;
}
