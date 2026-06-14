import {
  validateCaelRationPurchase,
  validatePetFeedSpecialRation,
} from '../../shared/economy/caelPetService.js';
import { formatPetAffinityGainPercent } from '../../shared/pet/petAffinity.js';
import { formatVolts } from '../../shared/economy/premiumCurrency.js';
import { getMockEconomyService } from '../economy/economyLayer.js';
import { getPlayerPetStore } from '../ui/pet/playerPetStore.js';
import { getPetStateStore } from '../ui/pet/PetStateStore.js';
import { getPlayerWalletStore } from '../ui/wallet/playerWalletStore.js';

export type PetFeedActionResult =
  | { readonly ok: true; readonly message: string }
  | { readonly ok: false; readonly reason: string };

/** @deprecated */
export type CaelPetActionResult = PetFeedActionResult;

function syncMockWalletMirror(): void {
  getMockEconomyService()?.syncWalletFromStore();
}

/** Total de cargas de ração na HUD Pet Love (não inventário). */
export function getPetRationCharges(): number {
  return getPlayerPetStore().getRationCharges();
}

/** @deprecated Use getPetRationCharges */
export const countOwnedPetRations = getPetRationCharges;

/** Compra pilha de ração no Ancião Cael — credita cargas na HUD Pet Love. */
export function executeCaelBuyPetRation(npcId: string): PetFeedActionResult {
  const wallet = getPlayerWalletStore().getSnapshot();
  const validation = validateCaelRationPurchase({
    npcId,
    walletVolts: wallet.dollarVolt,
  });
  if (!validation.ok) return validation;

  if (!getPlayerWalletStore().spendVolts(validation.priceVolts)) {
    return { ok: false, reason: 'Volts insuficientes' };
  }

  getPlayerPetStore().addRationCharges(validation.chargesGranted);
  syncMockWalletMirror();

  const total = getPetRationCharges();
  return {
    ok: true,
    message: `Ração Especial adquirida (−${formatVolts(validation.priceVolts)}). +${validation.chargesGranted} cargas na HUD Pet Love (${total} no total).`,
  };
}

/** Alimenta o pet selecionado — consome 1 carga de ração. */
export function executePetFeedSpecialRation(slotIndex?: number): PetFeedActionResult {
  const petStore = getPlayerPetStore();
  const roster = petStore.getRoster();
  const index = slotIndex ?? roster.selectedSlotIndex;
  const pet = roster.pets[index] ?? null;

  const validation = validatePetFeedSpecialRation({
    rationCharges: petStore.getRationCharges(),
    hasSelectedPet: pet !== null,
    petDefeated: pet ? pet.hpCurrent <= 0 : false,
    lastFeedAtMs: petStore.getLastPetRationFeedAtMs(),
  });
  if (!validation.ok) return validation;

  if (!petStore.consumeRationCharge()) {
    return { ok: false, reason: 'Sem cargas de ração — compre no Ancião Cael.' };
  }

  const care = getPetStateStore().applyDirectFeed(index);
  if (!care.ok) {
    petStore.addRationCharges(1);
    return { ok: false, reason: care.reason };
  }

  petStore.recordPetRationFeedAt();

  const remaining = petStore.getRationCharges();
  return {
    ok: true,
    message: `Alimentação em ${pet!.name}. Felicidade restaurada, envelhecimento pausado por 24 h e +${formatPetAffinityGainPercent(care.affinityGainRatio)}% de afinidade. Cargas restantes: ${remaining}.`,
  };
}

/** @deprecated Use executeCaelBuyPetRation */
export const executeCaelBuyApplyPetRation = executeCaelBuyPetRation;
