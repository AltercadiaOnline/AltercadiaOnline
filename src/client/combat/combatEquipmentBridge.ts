import { getPlayerEquipmentStore } from '../ui/equipment/playerEquipmentStore.js';
import { getPlayerItemStore } from '../ui/items/playerItemStore.js';
import { uiEvents, UIEventType } from '../ui/uiEvents.js';

let bridgeActive = false;
let bridgeOff: (() => void) | null = null;

/**
 * Mantém o espelho do SET alinhado ao PlayerItemStore antes do combat-join.
 * (publish() já chama loadUiGrid — bridge cobre eventos legados sem passar pelo store.)
 */
export function initCombatEquipmentBridge(): () => void {
  if (bridgeActive) {
    return () => destroyCombatEquipmentBridge();
  }
  bridgeActive = true;

  bridgeOff = uiEvents.on(UIEventType.PLAYER_ITEMS_UPDATED, () => {
    getPlayerEquipmentStore().loadUiGrid(getPlayerItemStore().toEquipmentGrid());
  });

  return () => destroyCombatEquipmentBridge();
}

export function destroyCombatEquipmentBridge(): void {
  bridgeOff?.();
  bridgeOff = null;
  bridgeActive = false;
}
