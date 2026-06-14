import type { ClientAction } from '../ActionDispatcher.js';
import {
  assignEquipmentSlotToInventory,
  assignItemToEquipmentSlot,
  equipmentGridFromItems,
  type PlayerItemRecord,
} from '../../shared/character/itemSlotModel.js';
import type { SyncLoadoutPayload } from '../../shared/world/playerLoadout.js';
import { getPlayerItemStore } from '../ui/items/playerItemStore.js';
import { resolveToggleItemSlotServerAction } from '../ui/equipment/toggleItemSlot.js';

function previewItemsAfterMutation(action: ClientAction): readonly PlayerItemRecord[] | null {
  const baseItems = getPlayerItemStore().getItems();

  switch (action.type) {
    case 'EQUIP_FROM_INVENTORY': {
      const preview = assignItemToEquipmentSlot(
        baseItems,
        action.payload.itemId,
        action.payload.uiSlotId,
      );
      return preview.ok ? preview.items : null;
    }
    case 'UNEQUIP_TO_INVENTORY': {
      const preview = assignEquipmentSlotToInventory(baseItems, action.payload.slotId);
      return preview.ok ? preview.items : null;
    }
    case 'EQUIP_ITEM': {
      const resolved = resolveToggleItemSlotServerAction(
        action.payload.itemId,
        action.payload.slot,
      );
      if (!resolved) return null;
      return previewItemsAfterMutation(resolved);
    }
    default:
      return null;
  }
}

/** Monta payload autoritativo para SYNC_LOADOUT após validar mutação local. */
export function buildSyncLoadoutPayload(action: ClientAction): SyncLoadoutPayload | null {
  const previewItems = previewItemsAfterMutation(action);
  if (!previewItems) return null;

  return {
    equipmentUiGrid: equipmentGridFromItems(previewItems),
  };
}
