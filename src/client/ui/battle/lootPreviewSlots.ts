import type { BattleLootPreview } from '../../../shared/loot/lootTypes.js';
import type { InventorySlotState } from '../../../shared/character/inventorySlots.js';
import { renderInventorySlot } from '../inventory/renderInventorySlot.js';

/** Converte preview autoritativo em slots de exibição (somente leitura). */
export function lootPreviewToInventorySlots(preview: BattleLootPreview): InventorySlotState[] {
  const slots: InventorySlotState[] = [];
  for (const row of preview.items) {
    for (let i = 0; i < row.quantity; i += 1) {
      slots.push({ itemId: row.itemId, quantity: 1 });
    }
  }
  return slots;
}

export function renderLootPreviewGrid(preview: BattleLootPreview, maxSlots = 12): string {
  const slots = lootPreviewToInventorySlots(preview).slice(0, maxSlots);
  const padded: InventorySlotState[] = [...slots];
  while (padded.length < Math.min(maxSlots, 8)) {
    padded.push({ itemId: null, quantity: 0 });
  }

  return padded.map((slot, index) => renderInventorySlot({
    index,
    slot,
    context: 'player-inventory',
  })).join('');
}
