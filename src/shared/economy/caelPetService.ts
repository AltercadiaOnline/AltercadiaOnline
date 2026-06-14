import { NPC_HEAL_PROVIDER_ANCIAO_CAEL } from '../world/npcHealService.js';
import {
  formatPetRationFeedCooldown,
  resolvePetRationFeedAvailability,
} from '../pet/petRationFeed.js';
import { PET_REVIVE_NPC_ID } from '../pet/petRevival.js';
import {
  CAEL_PET_RATION_PRICE_VOLTS,
  PET_SPECIAL_RATION_CHARGES_PER_PURCHASE,
  PET_SPECIAL_RATION_ITEM_ID,
} from '../pet/petLifecycleConfig.js';
import type { PetSnapshot } from '../pet/petModel.js';
import { isPetDefeated } from '../pet/petModel.js';

export { CAEL_PET_RATION_PRICE_VOLTS, PET_SPECIAL_RATION_ITEM_ID } from '../pet/petLifecycleConfig.js';

export const ANCIAO_CAEL_NPC_ID = NPC_HEAL_PROVIDER_ANCIAO_CAEL;

export function isAnciaoCaelNpc(npcId: string): boolean {
  return npcId === ANCIAO_CAEL_NPC_ID || npcId === PET_REVIVE_NPC_ID;
}

export type CaelPetRationQuote = {
  readonly itemId: typeof PET_SPECIAL_RATION_ITEM_ID;
  readonly itemLabel: string;
  readonly priceVolts: number;
  readonly chargesPerStack: number;
};

export function resolveCaelPetRationQuote(): CaelPetRationQuote {
  return {
    itemId: PET_SPECIAL_RATION_ITEM_ID,
    itemLabel: 'Ração Especial Cael',
    priceVolts: CAEL_PET_RATION_PRICE_VOLTS,
    chargesPerStack: PET_SPECIAL_RATION_CHARGES_PER_PURCHASE,
  };
}

export type ValidateCaelRationPurchaseInput = {
  readonly npcId: string;
  readonly walletVolts: number;
};

export function validateCaelRationPurchase(
  input: ValidateCaelRationPurchaseInput,
):
  | { readonly ok: true; readonly priceVolts: number; readonly chargesGranted: number }
  | { readonly ok: false; readonly reason: string } {
  if (!isAnciaoCaelNpc(input.npcId)) {
    return { ok: false, reason: 'Somente o Ancião Cael vende ração especial.' };
  }
  if (input.walletVolts < CAEL_PET_RATION_PRICE_VOLTS) {
    return { ok: false, reason: 'Volts insuficientes' };
  }
  return {
    ok: true,
    priceVolts: CAEL_PET_RATION_PRICE_VOLTS,
    chargesGranted: PET_SPECIAL_RATION_CHARGES_PER_PURCHASE,
  };
}

export type ValidatePetFeedSpecialRationInput = {
  readonly rationCharges: number;
  readonly hasSelectedPet: boolean;
  readonly petDefeated: boolean;
  readonly lastFeedAtMs?: number | null;
};

export function validatePetFeedSpecialRation(
  input: ValidatePetFeedSpecialRationInput,
  now = Date.now(),
):
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: string } {
  if (!input.hasSelectedPet) {
    return { ok: false, reason: 'Selecione um companheiro na HUD Pet Love.' };
  }
  if (input.petDefeated) {
    return { ok: false, reason: 'Companheiro ferido — não é possível alimentar agora.' };
  }
  if (input.rationCharges <= 0) {
    return { ok: false, reason: 'Sem cargas de ração — compre no Ancião Cael.' };
  }

  const availability = resolvePetRationFeedAvailability(input.lastFeedAtMs ?? null, now);
  if (!availability.canFeed) {
    const wait = formatPetRationFeedCooldown(availability.remainingMs);
    return {
      ok: false,
      reason: `Aguarde ${wait} para alimentar novamente (1 alimentação a cada 30 min).`,
    };
  }

  return { ok: true };
}

export type ValidateRevivePetAtCaelInput = {
  readonly npcId: string;
  readonly pet: PetSnapshot | null;
};

export function validateRevivePetAtCael(
  input: ValidateRevivePetAtCaelInput,
):
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: string } {
  if (!isAnciaoCaelNpc(input.npcId)) {
    return { ok: false, reason: 'Somente o Ancião Cael pode reviver companheiros.' };
  }
  if (!input.pet) {
    return { ok: false, reason: 'Nenhum companheiro selecionado.' };
  }
  if (!isPetDefeated(input.pet)) {
    return { ok: false, reason: 'Seu companheiro não precisa de revival.' };
  }
  return { ok: true };
}
