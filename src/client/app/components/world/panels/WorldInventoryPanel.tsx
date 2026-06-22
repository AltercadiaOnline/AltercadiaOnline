import { useCallback, useMemo, useState, type MouseEvent } from 'react';
import {
  INVENTORY_GRID_COLUMNS,
  INVENTORY_GRID_ROWS,
} from '../../../../../shared/character/inventorySlots.js';
import {
  canShowInventoryDeleteButton,
  validateInventoryDeleteIntent,
} from '../../../../../shared/economy/inventoryPolicy.js';
import { DIARIO_MEMORIAS_ITEM_ID } from '../../../../../shared/items/soulboundItems.js';
import { getActionDispatcher, type DispatchResult } from '../../../../ActionDispatcher.js';
import { selectInventorySlotTooltipLabel } from '../../../../core/gameStoreSelectors.js';
import * as InventoryService from '../../../../services/inventory/InventoryService.js';
import { getContextMenuService } from '../../../../ui/contextMenu/ContextMenuService.js';
import { dispatchEquipFromInventory } from '../../../../ui/equipment/equipItemAction.js';
import { openDiaryPanel } from '../../../../ui/diary/openDiaryPanel.js';
import {
  resolveInventoryItemAbbrev,
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

type WorldInventoryPanelProps = {
  zIndex: number;
  focused: boolean;
};

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
    if (itemId === DIARIO_MEMORIAS_ITEM_ID) {
      openDiaryPanel();
      return;
    }
    setSelectedSlotIndex((current) => (current === slotIndex ? null : slotIndex));
  }, []);

  const handleSlotDoubleClick = useCallback((itemId: string) => {
    if (InventoryService.isInventoryMutationPending()) return;
    if (!InventoryService.canEquipItem(itemId)) return;
    dispatchEquipFromInventory(itemId);
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

  const { submit: submitDelete, pending: deletePending, buttonLabel: deleteButtonLabel } =
    useActionGatewaySubmit({
      onClick: requestDeleteSelected,
      onResolved: () => setSelectedSlotIndex(null),
      idleLabel: 'Deletar',
      pendingLabel: 'Descartando…',
    });

  return (
    <MovablePanelFrame
      windowId="inventory"
      title="Inventário"
      zIndex={zIndex}
      focused={focused}
      panelClassName="world-panel--inventory ui-panel--inventory"
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
                {resolveInventoryItemAbbrev(selectedItemId)}
              </span>
              <p className="inventory-panel__selection-label">
                {resolveInventoryItemLabel(selectedItemId)}
                {selectedSlot.quantity > 1 ? ` ×${selectedSlot.quantity}` : ''}
              </p>
            </div>
            {canDeleteSelected ? (
              <button
                type="button"
                className="inventory-panel__delete-btn"
                aria-label={`Deletar ${resolveInventoryItemLabel(selectedItemId)}`}
                title="Descartar item"
                disabled={deletePending || syncPending}
                aria-busy={deletePending || undefined}
                onClick={submitDelete}
              >
                <span className="inventory-panel__delete-icon" aria-hidden="true">🗑</span>
                <span>{deleteButtonLabel}</span>
              </button>
            ) : null}
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
                onDoubleClick={handleSlotDoubleClick}
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
