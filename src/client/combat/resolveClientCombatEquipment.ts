import type { EquippedSlots } from '../../shared/character/equipmentState.js';
import { equipmentUiGridToEquipped } from '../../shared/character/equipmentUiSlots.js';
import { getPlayerItemStore } from '../ui/items/playerItemStore.js';

/** SSOT cliente — SET vem do PlayerItemStore, não do espelho legado do equipment store. */
export function resolveClientCombatEquipmentSnapshot(): EquippedSlots {
  return equipmentUiGridToEquipped(getPlayerItemStore().toEquipmentGrid());
}
