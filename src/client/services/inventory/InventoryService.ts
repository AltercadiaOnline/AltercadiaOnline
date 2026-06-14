/**
 * FLUXO DE DADOS — InventoryService
 *
 * UI (InventoryPanel, EquipmentSidebar, context menu)
 *   → InventoryService.equipFromInventory / unequipFromSlot
 *   → ActionDispatcher (intenção EQUIP_* / UNEQUIP_*)
 *   → GameStore.performServerAction (optimistic + pendingActions)
 *   → Servidor confirma → GameTransactionCoordinator.confirmTransaction
 *   → Falha → alertSystem + rollback automático
 *
 * UI NUNCA chama playerItemStore, Supabase ou ActionDispatcher diretamente.
 */

import type { EquipmentUiSlotId } from '../../../shared/character/equipmentUiSlots.js';
import { findCompatibleEquipmentUiSlot } from '../../../shared/character/equipItemMapping.js';
import { getActionDispatcher } from '../../ActionDispatcher.js';
import { reportTransactionFailure } from '../../core/GameTransactionCoordinator.js';
import { getGameStore } from '../../state/GameStore.js';
import { isSyncPending } from '../../core/gameStoreSelectors.js';

export type InventoryActionResult = {
  readonly ok: boolean;
  readonly reason?: string;
  readonly intentId?: string;
};

function dispatchInventoryAction(
  action: Parameters<ReturnType<typeof getActionDispatcher>['dispatch']>[0],
  fallbackMessage: string,
): InventoryActionResult {
  if (isSyncPending()) {
    const message = 'Aguarde a sincronização do inventário.';
    reportTransactionFailure(null, message, message);
    return { ok: false, reason: message };
  }

  const result = getActionDispatcher().dispatch(action);

  if (!result.ok) {
    reportTransactionFailure(null, result.reason, fallbackMessage);
    return { ok: false, reason: result.reason };
  }

  return {
    ok: true,
    ...(result.status === 'pending' ? { intentId: result.intentId } : {}),
  };
}

export function canEquipItem(itemId: string): boolean {
  return Boolean(findCompatibleEquipmentUiSlot(itemId));
}

export function equipFromInventory(
  itemId: string,
  slot?: EquipmentUiSlotId,
): InventoryActionResult {
  return dispatchInventoryAction(
    {
      type: 'EQUIP_FROM_INVENTORY',
      payload: {
        itemId,
        ...(slot !== undefined ? { uiSlotId: slot } : {}),
      },
    },
    'Não foi possível equipar o item.',
  );
}

export function unequipFromSlot(slotId: EquipmentUiSlotId): InventoryActionResult {
  return dispatchInventoryAction(
    {
      type: 'UNEQUIP_TO_INVENTORY',
      payload: { slotId },
    },
    'Não foi possível desequipar o item.',
  );
}

export function toggleItemSlot(
  itemId: string,
  targetSlot?: EquipmentUiSlotId,
): InventoryActionResult {
  return dispatchInventoryAction(
    {
      type: 'EQUIP_ITEM',
      payload: {
        itemId,
        ...(targetSlot !== undefined ? { slot: targetSlot } : {}),
      },
    },
    'Não foi possível alterar o equipamento.',
  );
}

export function isInventoryMutationPending(): boolean {
  return getGameStore().hasPendingActions();
}

export function subscribeInventoryView(
  listener: () => void,
): () => void {
  return getGameStore().subscribe((_, slice) => {
    if (slice === 'player' || slice === 'pendingActions' || slice === '*') {
      listener();
    }
  });
}
