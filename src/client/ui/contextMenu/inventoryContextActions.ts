import { ItemCategory } from '../../../shared/items/itemSchema.js';
import { getItemById } from '../../../shared/items/itemCatalog.js';
import { DIARIO_MEMORIAS_ITEM_ID } from '../../../shared/items/soulboundItems.js';
import { openDiaryPanel } from '../diary/openDiaryPanel.js';
import { getGameStateManager } from '../../../shared/state/GameStateManager.js';
import { findCompatibleEquipmentSlot } from '../equipment/inventoryEquip.js';
import {
  dispatchEquipFromInventory,
  dispatchUnequipFromSlot,
} from '../equipment/equipItemAction.js';
import {
  equipFromInventoryFailureMessage,
  validateEquipInventoryItemToSet,
} from '../equipment/equipFromInventory.js';
import { getPlayerItemStore } from '../items/playerItemStore.js';
import {
  hasPendingItemMutation,
  isEquipSlotMutationPending,
  isInventoryItemMutationPending,
} from '../items/itemMutationPendingUi.js';
import { postSystemNotification } from '../logService.js';
import type { ActionMenuItem } from './actionMenuTypes.js';
import type { EquipSlotMenuTarget, InventorySlotMenuTarget } from './actionMenuProviders.js';

function isEquipCategory(category: ItemCategory): boolean {
  return category === ItemCategory.Equipable
    || category === ItemCategory.Rune
    || category === ItemCategory.Book;
}

function resolveInventorySlotState(
  target: InventorySlotMenuTarget | undefined,
): { readonly itemId: string; readonly locked: boolean } | null {
  if (!target) return null;

  const item = getItemById(target.itemId);
  if (!item) return null;

  const slot = getPlayerItemStore().getInventorySnapshot().slots[target.slotIndex];
  if (!slot?.itemId || slot.itemId !== target.itemId || slot.quantity <= 0) {
    return null;
  }

  return {
    itemId: target.itemId,
    locked: (slot.lockedQuantity ?? 0) > 0,
  };
}

/** Factory de ações — consulta catálogo + playerItemStore antes de montar o menu. */
export function buildInventorySlotContextActions(
  target: InventorySlotMenuTarget | undefined,
): readonly ActionMenuItem[] {
  const slotState = resolveInventorySlotState(target);
  if (!slotState) return [];

  const { itemId, locked } = slotState;
  const item = getItemById(itemId)!;
  const actions: ActionMenuItem[] = [];

  if (itemId === DIARIO_MEMORIAS_ITEM_ID) {
    actions.push({
      id: 'inventory-open-diary',
      label: 'Abrir Diário',
      icon: '📔',
      disabled: () => false,
      run: () => {
        openDiaryPanel();
      },
    });
  }

  const mutationBlocked = (): boolean =>
    locked
    || hasPendingItemMutation()
    || isInventoryItemMutationPending(itemId);

  if (isEquipCategory(item.category)) {
    const uiSlot = findCompatibleEquipmentSlot(itemId);
    if (uiSlot) {
      actions.push({
        id: 'inventory-equip',
        label: 'Equipar',
        icon: '⚔',
        disabled: () => {
          if (mutationBlocked()) return true;
          const validation = validateEquipInventoryItemToSet(itemId);
          return !validation.ok;
        },
        run: () => {
          const validation = validateEquipInventoryItemToSet(itemId);
          if (!validation.ok) {
            postSystemNotification(equipFromInventoryFailureMessage(validation.reason));
            return;
          }
          dispatchEquipFromInventory(itemId, validation.uiSlotId);
        },
      });
    }
  }

  if (item.category === ItemCategory.Potion) {
    actions.push({
      id: 'inventory-use',
      label: 'Usar',
      icon: '✦',
      disabled: () => mutationBlocked() || getGameStateManager().isExploration(),
      run: () => {
        if (getGameStateManager().isExploration()) {
          postSystemNotification('Consumíveis só podem ser usados em combate.');
          return;
        }
        postSystemNotification('Selecione o consumível na barra de batalha.');
      },
    });
  }

  return actions;
}

export function buildEquipSlotContextActions(
  target: EquipSlotMenuTarget | undefined,
): readonly ActionMenuItem[] {
  if (!target) return [];

  const row = getPlayerItemStore().getItemInSlot(target.slotId);
  if (!row?.itemId) return [];

  return [
    {
      id: 'equip-unequip',
      label: 'Desequipar',
      icon: '↓',
      disabled: () =>
        hasPendingItemMutation()
        || isEquipSlotMutationPending(target.slotId),
      run: () => {
        dispatchUnequipFromSlot(target.slotId);
      },
    },
  ];
}
