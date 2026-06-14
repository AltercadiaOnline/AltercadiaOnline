import { purchasePetAtTrainer } from '../../../Economy/economyGateway.js';
import type { PetKindId } from '../../../shared/pet/petCatalog.js';
import type { PetColorId } from '../../../shared/pet/petColorPalette.js';
import type { PetGenderId } from '../../../shared/pet/petGender.js';
import { BaseIntentHandler } from '../../network/BaseIntentHandler.js';

export type PurchasePetPayload = {
  readonly vendorId: string;
  readonly kindId: PetKindId;
  readonly name: string;
  readonly colorId: PetColorId;
  readonly gender: PetGenderId;
};

export class PurchasePetHandler extends BaseIntentHandler<PurchasePetPayload> {
  readonly actionType = 'PURCHASE_PET';

  async execute(playerId: string, payload: PurchasePetPayload, intentId: string): Promise<void> {
    const result = await purchasePetAtTrainer({
      playerId,
      characterId: this.characterId,
      vendorId: payload.vendorId,
      kindId: payload.kindId,
      name: payload.name,
      colorId: payload.colorId,
      gender: payload.gender,
      intentId,
    });

    if (!result.ok) {
      this.sendResponse(playerId, intentId, false, result.code);
      return;
    }

    this.sendResponse(playerId, intentId, true, {
      petName: result.petName,
      priceVolts: result.priceVolts,
    });
  }
}

let handler: PurchasePetHandler | null = null;

export function getPurchasePetHandler(): PurchasePetHandler {
  if (!handler) handler = new PurchasePetHandler();
  return handler;
}
