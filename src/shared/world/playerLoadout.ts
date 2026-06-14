import type { EquippedSlots } from '../character/equipmentState.js';
import type { EquipmentUiGridState } from '../character/equipmentUiSlots.js';
import {
  createEmptyEquipmentUiGrid,
  equipmentUiGridToEquipped,
} from '../character/equipmentUiSlots.js';

/** SET visual persistido no worldProfile — fonte da verdade para InventoryUpdated. */
export type PlayerLoadoutData = {
  readonly equipmentUiGrid: EquipmentUiGridState;
  readonly equipped?: EquippedSlots;
};

export type SyncLoadoutPayload = PlayerLoadoutData;

export function normalizePlayerLoadoutData(
  loadout: SyncLoadoutPayload,
): PlayerLoadoutData {
  const equipmentUiGrid = { ...createEmptyEquipmentUiGrid(), ...loadout.equipmentUiGrid };
  return {
    equipmentUiGrid,
    equipped: loadout.equipped ?? equipmentUiGridToEquipped(equipmentUiGrid),
  };
}
