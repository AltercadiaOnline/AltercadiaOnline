import type { PlayerItemRecord } from '../../../shared/character/itemSlotModel.js';
import {
  findInventoryEquipmentOverlap,
  ItemLocationSlot,
} from '../../../shared/character/itemSlotModel.js';

/**
 * Valida invariantes do array bruto de itens antes do coalesce corrigir a projeção.
 * Deve rodar em qualquer leitura que alimente inventário ou SET na UI.
 */
export class ItemStateValidator {
  static auditInventoryEquipmentOverlap(items: readonly PlayerItemRecord[]): void {
    const seenInstanceIds = new Map<string, PlayerItemRecord>();

    for (const row of items) {
      const prev = seenInstanceIds.get(row.instanceId);
      if (prev) {
        console.error(
          '🚨 BUG DETECTADO: instanceId duplicado no array de itens!',
          { instanceId: row.instanceId, first: prev, duplicate: row },
        );
      }
      seenInstanceIds.set(row.instanceId, row);
    }

    const inventory = items.filter((row) => row.slot === ItemLocationSlot.Inventory);
    const equipped = items.filter((row) => row.slot !== ItemLocationSlot.Inventory);

    for (const row of inventory) {
      const equippedCopy = equipped.find((eq) => eq.itemId === row.itemId);
      if (equippedCopy) {
        console.error(
          '🚨 BUG DETECTADO: Item no inventário E no SET simultaneamente!',
          {
            itemId: row.itemId,
            inventoryInstanceId: row.instanceId,
            equippedInstanceId: equippedCopy.instanceId,
            inventoryRow: row,
            equippedRow: equippedCopy,
          },
        );
      }
    }

    const overlapIds = findInventoryEquipmentOverlap(items);
    if (overlapIds.length > 0) {
      console.warn('[ItemDup] coalesce irá corrigir:', overlapIds);
    }
  }
}
