import type { PlayerItemRecord } from '../../../shared/character/itemSlotModel.js';
import { findDuplicateItemInstanceIds } from '../../../shared/character/itemSlotModel.js';

/**
 * Valida invariantes do array de itens.
 * Mesmo `itemId` na mochila e no SET é válido (cópia vestida ≠ cópia na bag).
 */
export class ItemStateValidator {
  static auditInventoryEquipmentOverlap(items: readonly PlayerItemRecord[]): void {
    for (const instanceId of findDuplicateItemInstanceIds(items)) {
      console.error('🚨 BUG DETECTADO: instanceId duplicado no array de itens!', { instanceId });
    }
  }
}
