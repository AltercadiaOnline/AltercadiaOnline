import { useCallback, useMemo, useState, type MouseEvent } from 'react';
import {
  INVENTORY_GRID_COLUMNS,
  INVENTORY_GRID_ROWS,
} from '../../../../../shared/character/inventorySlots.js';
import {
  canShowInventoryDeleteButton,
  validateInventoryDeleteIntent,
} from '../../../../../shared/economy/inventoryPolicy.js';
import { getActionDispatcher, type DispatchResult } from '../../../../ActionDispatcher.js';
import { selectInventorySlotTooltipLabel } from '../../../../core/gameStoreSelectors.js';
import * as InventoryService from '../../../../services/inventory/InventoryService.js';
import { getContextMenuService } from '../../../../ui/contextMenu/ContextMenuService.js';
import {
  equipFromInventoryFailureMessage,
  validateEquipInventoryItemToSet,
} from '../../../../ui/equipment/equipFromInventory.js';
import {
  resolveInventoryItemKindClass,
  resolveInventoryItemLabel,
} from '../../../../ui/inventory/inventoryItemDisplay.js';
import { emitItemTooltip } from '../../../../ui/tooltip/emitItemTooltip.js';
import { uiEvents, UIEventType } from '../../../../ui/uiEvents.js';
import { useActionGatewaySubmit } from '../../../panels/useActionGatewaySubmit.js';
import { tryCloseReactWorldPanel, tryFocusReactWorldPanel } from '../../../panels/initWorldPanelsBridge.js';
import { useInventoryPanelState } from '../../../panels/useInventoryPanelState.js';
import { MovablePanelFrame } from '../MovablePanelFrame.js';
import { InventorySlotCell } from './InventorySlotCell.js';
import { ItemSlotIcon } from './ItemSlotIcon.js';

type WorldInventoryPanelProps = {
  zIndex: number;
  focused: boolean;
};

function toEquipDispatchResult(result: InventoryService.InventoryActionResult): DispatchResult {
  if (!result.ok) {
    return { ok: false, reason: result.reason ?? 'Não foi possível equipar o item.' };
  }
  if (result.intentId) {
    return { ok: true, status: 'pending', intentId: result.intentId };
  }
  return { ok: true, status: 'applied' };
}

export function WorldInventoryPanel({ zIndex, focused }: WorldInventoryPanelProps) {
  const { inventory, gold, syncPending, vendorOpen } = useInventoryPanelState();
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number | null>(null);

  const selectedSlot = selectedSlotIndex !== null
    ? inventory.slots[selectedSlotIndex] ?? null
    : null;

  const selectedItemId = selectedSlot?.itemId && selectedSlot.quantity > 0
    ? selectedSlot.itemId
    : null;

  const canDeleteSelected = useMemo(() => {
    if (!selectedSlot?.itemId || selectedSlot.quantity <= 0) return false;
    return canShowInventoryDeleteButton({
      itemId: selectedSlot.itemId,
      slotQuantity: selectedSlot.quantity,
      ...(selectedSlot.lockedQuantity !== undefined
        ? { lockedQuantity: selectedSlot.lockedQuantity }
        : {}),
    });
  }, [selectedSlot]);

  const canEquipSelected = useMemo(() => {
    if (!selectedItemId) return false;
    if ((selectedSlot?.lockedQuantity ?? 0) > 0) return false;
    return InventoryService.canEquipItem(selectedItemId);
  }, [selectedItemId, selectedSlot?.lockedQuantity]);

  const handleTooltipShow = useCallback((event: MouseEvent, itemId: string) => {
    const heldAmountLabel = selectInventorySlotTooltipLabel(itemId);
    emitItemTooltip(itemId, event.clientX, event.clientY, {
      vendorOpen,
      ...(heldAmountLabel ? { heldAmountLabel } : {}),
    });
  }, [vendorOpen]);

  const handleTooltipHide = useCallback(() => {
    uiEvents.emit(UIEventType.HIDE_TOOLTIP, {});
  }, []);

  const handleSlotClick = useCallback((itemId: string, slotIndex: number) => {
    setSelectedSlotIndex((current) => (current === slotIndex ? null : slotIndex));
  }, []);

  const handleSlotContextMenu = useCallback((
    event: MouseEvent,
    itemId: string,
    slotIndex: number,
  ) => {
    event.preventDefault();
    getContextMenuService().open({
      kind: 'inventory-slot',
      clientX: event.clientX,
      clientY: event.clientY,
      nativeEvent: event.nativeEvent,
      target: { slotIndex, itemId },
    });
  }, []);

  const handlePanelMouseDown = useCallback(() => {
    getContextMenuService().close();
  }, []);

  const requestEquipSelected = useCallback((): DispatchResult => {
    if (!selectedItemId) {
      return { ok: false, reason: 'Nenhum item selecionado.' };
    }
    if (InventoryService.isInventoryMutationPending()) {
      return { ok: false, reason: 'Aguarde a sincronização do inventário.' };
    }

    const validation = validateEquipInventoryItemToSet(selectedItemId);
    if (!validation.ok) {
      return { ok: false, reason: equipFromInventoryFailureMessage(validation.reason) };
    }

    return toEquipDispatchResult(
      InventoryService.equipFromInventory(selectedItemId, validation.uiSlotId),
    );
  }, [selectedItemId]);

  const requestDeleteSelected = useCallback((): DispatchResult => {
    if (selectedSlotIndex === null || !selectedSlot?.itemId) {
      return { ok: false, reason: 'Nenhum item selecionado.' };
    }

    const policy = validateInventoryDeleteIntent({
      itemId: selectedSlot.itemId,
      quantity: 1,
      slotQuantity: selectedSlot.quantity,
      ...(selectedSlot.lockedQuantity !== undefined
        ? { lockedQuantity: selectedSlot.lockedQuantity }
        : {}),
    });
    if (!policy.ok) {
      return { ok: false, reason: policy.reason };
    }

    if (InventoryService.isInventoryMutationPending()) {
      return { ok: false, reason: 'Aguarde a sincronização do inventário.' };
    }

    return getActionDispatcher().dispatch({
      type: 'DELETE_ITEM',
      payload: {
        itemId: selectedSlot.itemId,
        quantity: 1,
        slotIndex: selectedSlotIndex,
      },
    });
  }, [selectedSlot, selectedSlotIndex]);

  const { submit: submitEquip, pending: equipPending, buttonLabel: equipButtonLabel } =
    useActionGatewaySubmit({
      onClick: requestEquipSelected,
      onResolved: () => setSelectedSlotIndex(null),
      idleLabel: 'Equipar',
      pendingLabel: 'Equipando…',
    });

  const { submit: submitDelete, pending: deletePending, buttonLabel: deleteButtonLabel } =
    useActionGatewaySubmit({
      onClick: requestDeleteSelected,
      onResolved: () => setSelectedSlotIndex(null),
      idleLabel: 'Deletar',
      pendingLabel: 'Descartando…',
    });

  const actionsBusy = deletePending || equipPending || syncPending;

  return (
    <MovablePanelFrame
      windowId="inventory"
      title="Inventário"
      titleMeta="// SYS/INV // 01"
      zIndex={zIndex}
      focused={focused}
      panelClassName="world-panel--inventory ui-panel--inventory ui-panel--inventory-hybrid"
      panelStyle={{ width: 'min(520px, 96vw)' }}
      onFocus={() => tryFocusReactWorldPanel('inventory')}
      onClose={() => tryCloseReactWorldPanel('inventory')}
    >
      <div onMouseDown={handlePanelMouseDown}>
        <p className="inventory-panel__meta mb-2 text-[11px] text-white/60">
          {inventory.used} / {inventory.capacity} slots
          {syncPending ? (
            <span className="inventory-panel__sync ml-2" aria-busy="true" title="Sincronizando…">⟳</span>
          ) : null}
        </p>

        {selectedItemId && selectedSlot ? (
          <div className="inventory-panel__selection-bar" aria-live="polite">
            <div className="inventory-panel__selection-main">
              <span
                className={`inventory-panel__selection-abbrev ${resolveInventoryItemKindClass(selectedItemId)}`}
                aria-hidden="true"
              >
                <ItemSlotIcon itemId={selectedItemId} className="slot-item__sprite slot-item__sprite--lg" />
              </span>
              <p className="inventory-panel__selection-label">
                {resolveInventoryItemLabel(selectedItemId)}
                {selectedSlot.quantity > 1 ? ` ×${selectedSlot.quantity}` : ''}
              </p>
            </div>
            <div className="inventory-panel__selection-actions">
              {canEquipSelected ? (
                <button
                  type="button"
                  className="inventory-panel__confirm-btn"
                  aria-label={`Equipar ${resolveInventoryItemLabel(selectedItemId)} no SET`}
                  disabled={actionsBusy}
                  aria-busy={equipPending || undefined}
                  onClick={submitEquip}
                >
                  <span className="inventory-panel__confirm-icon" aria-hidden="true">✓</span>
                  <span>{equipButtonLabel}</span>
                </button>
              ) : null}
              {canDeleteSelected ? (
                <button
                  type="button"
                  className="inventory-panel__delete-btn"
                  aria-label={`Deletar ${resolveInventoryItemLabel(selectedItemId)}`}
                  disabled={actionsBusy}
                  aria-busy={deletePending || undefined}
                  onClick={submitDelete}
                >
                  <span className="inventory-panel__delete-icon" aria-hidden="true">🗑</span>
                  <span>{deleteButtonLabel}</span>
                </button>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="inventory-panel__frame">
          <div
            className="inventory-grid"
            role="grid"
            aria-label="Inventário"
            style={{
              ['--inventory-cols' as string]: INVENTORY_GRID_COLUMNS,
              ['--inventory-rows' as string]: INVENTORY_GRID_ROWS,
            }}
          >
            {inventory.slots.map((slot, index) => (
              <InventorySlotCell
                key={`inv-slot-${index}`}
                index={index}
                slot={slot}
                wallet={gold}
                pending={syncPending && Boolean(slot.itemId)}
                vendorOpen={vendorOpen}
                selected={selectedSlotIndex === index}
                onClick={handleSlotClick}
                onContextMenu={(event, itemId) => handleSlotContextMenu(event, itemId, index)}
                onTooltipShow={handleTooltipShow}
                onTooltipHide={handleTooltipHide}
              />
            ))}
          </div>
        </div>
      </div>
    </MovablePanelFrame>
  );
}
