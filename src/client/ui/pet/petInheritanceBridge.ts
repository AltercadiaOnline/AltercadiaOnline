import { addItemToInventoryStacks } from '../../../shared/character/inventoryStackOps.js';
import { getPlayerItemStore } from '../items/playerItemStore.js';
import { uiEvents, UIEventType } from '../uiEvents.js';
import { postSystemNotification } from '../logService.js';

/** Concede token de herança no inventário local (mock/offline até gateway autoritativo). */
export function initPetInheritanceBridge(): () => void {
  return uiEvents.on(UIEventType.PET_INHERITANCE_GRANTED, (payload) => {
    const itemStore = getPlayerItemStore();
    const result = addItemToInventoryStacks(itemStore.toInventoryStacks(), payload.tokenId, 1);
    if (result.added > 0) {
      itemStore.hydrateFromServerBundle(result.stacks, {
        uiGrid: itemStore.toEquipmentGrid(),
        equipped: itemStore.getEquippedSlots(),
      });
    }

    if (typeof document === 'undefined') return;

    const skillNote = payload.preservedSkillId
      ? ` Skill preservada: ${payload.preservedSkillId}.`
      : '';
    postSystemNotification(
      `Token de Lembrança recebido: ${payload.tokenName}.${skillNote}`,
    );
  });
}

export function initPetMemorialNotificationBridge(): () => void {
  return uiEvents.on(UIEventType.PET_MEMORIAL_CREATED, (payload) => {
    if (typeof document === 'undefined') return;
    postSystemNotification(
      `${payload.memorial.petName} entrou no Livro de Memórias (${payload.memorial.ageYearsAtDeath.toFixed(1)} anos).`,
    );
  });
}
