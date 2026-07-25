// @ts-nocheck
import { useEffect, useRef } from 'react';
import { INVENTORY_GRID_COLUMNS, INVENTORY_GRID_ROWS, } from '../../../../shared/character/inventorySlots.js';
import { DIARIO_MEMORIAS_ITEM_ID } from '../../../../shared/items/soulboundItems.js';
import { openDiaryPanel } from '../../../ui/diary/openDiaryPanel.js';
import { dispatchEquipFromInventory } from '../../../ui/equipment/equipItemAction.js';
import { getContextMenuService } from '../../../ui/contextMenu/ContextMenuService.js';
import { InventoryService } from '../../../services/index.js';
import { useInventoryPanel } from '../../panels/useInventoryPanel.js';
import { MovablePanelShell } from './MovablePanelShell.js';
import { InventorySlotCell } from './InventorySlotCell.js';
export function InventoryPanelHud({ focused }) {
    const view = useInventoryPanel(true);
    const rootRef = useRef(null);
    useEffect(() => {
        const root = rootRef.current;
        if (!root)
            return;
        const dismiss = (event) => {
            if (event.button !== 0)
                return;
            getContextMenuService().close();
        };
        root.addEventListener('mousedown', dismiss);
        return () => root.removeEventListener('mousedown', dismiss);
    }, []);
    const handleDiaryClick = (itemId) => {
        if (itemId !== DIARIO_MEMORIAS_ITEM_ID)
            return;
        openDiaryPanel();
    };
    const handleEquipDoubleClick = (itemId) => {
        if (InventoryService.isInventoryMutationPending())
            return;
        if (!InventoryService.canEquipItem(itemId))
            return;
        dispatchEquipFromInventory(itemId);
    };
    return (<MovablePanelShell panelId="inventory" className="ui-panel--inventory" headerClassName="ui-panel__header inventory-panel__header" title="Inventário" focused={focused} bodyClassName="ui-panel__body ui-panel__body--inventory" headerMeta={(<p className="inventory-panel__meta" data-hud-fit-secondary>
          {view.used}
          {' / '}
          {view.capacity}
          {' slots'}
          {view.syncPending ? (<span className="inventory-panel__sync" aria-busy="true" title="Sincronizando…">
              {' '}
              ⟳
            </span>) : null}
        </p>)}>
      <div ref={rootRef} className="inventory-panel__frame" data-hud-fit-root>
          <div className="inventory-grid" role="grid" aria-label="Inventário" style={{
            ['--inventory-cols']: INVENTORY_GRID_COLUMNS,
            ['--inventory-rows']: INVENTORY_GRID_ROWS,
        }}>
            {view.slots.map((slot, index) => (<InventorySlotCell key={index} index={index} slot={slot} pending={view.syncPending && Boolean(slot.itemId)} wallet={view.wallet} npcVendorOpen={view.npcVendorOpen} onDiaryClick={() => {
                if (slot.itemId)
                    handleDiaryClick(slot.itemId);
            }} onEquipDoubleClick={handleEquipDoubleClick}/>))}
          </div>
        </div>
    </MovablePanelShell>);
}
