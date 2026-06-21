import { useCallback, type MouseEvent } from 'react';
import {
  INVENTORY_GRID_COLUMNS,
  INVENTORY_GRID_ROWS,
} from '../../../../../shared/character/inventorySlots.js';
import { getItemById } from '../../../../../shared/items/itemCatalog.js';
import { DIARIO_MEMORIAS_ITEM_ID } from '../../../../../shared/items/soulboundItems.js';
import {
  isMarketplaceListableItem,
  isNpcVendorSellableItem,
} from '../../../../../shared/economy/itemValorEconomy.js';
import { NPC_HIGH_VALUE_MARKETPLACE_HINT } from '../../../../../shared/economy/npcSellRarityPolicy.js';
import * as InventoryService from '../../../../services/inventory/InventoryService.js';
import { selectInventorySlotTooltipLabel } from '../../../../core/gameStoreSelectors.js';
import { getContextMenuService } from '../../../../ui/contextMenu/ContextMenuService.js';
import { dispatchEquipFromInventory } from '../../../../ui/equipment/equipItemAction.js';
import { openDiaryPanel } from '../../../../ui/diary/openDiaryPanel.js';
import { uiEvents, UIEventType } from '../../../../ui/uiEvents.js';
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

  const handleTooltipShow = useCallback((event: MouseEvent, itemId: string) => {
    const item = getItemById(itemId);
    if (!item) return;

    if (
      vendorOpen
      && isMarketplaceListableItem(itemId)
      && !isNpcVendorSellableItem(itemId)
    ) {
      uiEvents.emit(UIEventType.SHOW_TOOLTIP, {
        data: {
          kind: 'marco',
          data: { name: item.name, effect: NPC_HIGH_VALUE_MARKETPLACE_HINT },
        },
        x: event.clientX,
        y: event.clientY,
      });
      return;
    }

    const heldAmountLabel = selectInventorySlotTooltipLabel(itemId);
    uiEvents.emit(UIEventType.SHOW_TOOLTIP, {
      data: {
        kind: 'item',
        data: item,
        ...(heldAmountLabel ? { heldAmountLabel } : {}),
      },
      x: event.clientX,
      y: event.clientY,
    });
  }, [vendorOpen]);

  const handleTooltipHide = useCallback(() => {
    uiEvents.emit(UIEventType.HIDE_TOOLTIP, {});
  }, []);

  const handleSlotClick = useCallback((itemId: string) => {
    if (itemId === DIARIO_MEMORIAS_ITEM_ID) {
      openDiaryPanel();
    }
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
