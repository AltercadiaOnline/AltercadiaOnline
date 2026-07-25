// @ts-nocheck
import { isChargedInventoryStackItemId, resolveStackDurabilityCharges, } from '../../../../shared/items/chargedEquipment.js';
import { isMarketplaceListableItem, isNpcVendorSellableItem, } from '../../../../shared/economy/itemValorEconomy.js';
import { NPC_HIGH_VALUE_MARKETPLACE_HINT } from '../../../../shared/economy/npcSellRarityPolicy.js';
import { getItemById } from '../../../../shared/items/itemCatalog.js';
import { resolveInventoryItemAbbrev, resolveInventoryItemKindClass, resolveInventoryItemLabel, } from '../../../ui/inventory/inventoryItemDisplay.js';
import { isWalletBackedCurrencyItemId, resolveWalletCurrencySlotQtyLabel, } from '../../../ui/inventory/inventoryCurrencyDisplay.js';
import { selectInventorySlotTooltipLabel } from '../../../services/index.js';
import { uiEvents, UIEventType } from '../../../ui/uiEvents.js';
function resolveQuantityBadge(slot, wallet) {
    if (slot.itemId && isWalletBackedCurrencyItemId(slot.itemId)) {
        const label = resolveWalletCurrencySlotQtyLabel(slot.itemId, wallet);
        if (label) {
            return (<span className="slot-item__meta slot-item__meta--qty slot-item__meta--wallet">
          {label}
        </span>);
        }
    }
    if (slot.quantity > 1) {
        return (<span className="slot-item__meta slot-item__meta--qty">
        {slot.quantity}
      </span>);
    }
    return null;
}
export function InventorySlotCell({ index, slot, pending, wallet, npcVendorOpen, onDiaryClick, onEquipDoubleClick, }) {
    if (!slot.itemId || slot.quantity <= 0) {
        return (<div className="slot-item" role="gridcell" data-inventory-slot={index} data-hud-fit-item data-hud-priority="5" aria-label={`Slot vazio ${index + 1}`}/>);
    }
    const label = resolveInventoryItemLabel(slot.itemId);
    const abbrev = resolveInventoryItemAbbrev(slot.itemId);
    const kindClass = resolveInventoryItemKindClass(slot.itemId);
    const npcHighValue = npcVendorOpen
        && isMarketplaceListableItem(slot.itemId)
        && !isNpcVendorSellableItem(slot.itemId);
    const locked = (slot.lockedQuantity ?? 0) > 0;
    const showCharges = isChargedInventoryStackItemId(slot.itemId);
    const contextMenuTarget = JSON.stringify({ slotIndex: index, itemId: slot.itemId });
    const handleMouseEnter = (event) => {
        const item = getItemById(slot.itemId);
        if (!item)
            return;
        if (npcHighValue) {
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
        const heldAmountLabel = selectInventorySlotTooltipLabel(slot.itemId);
        uiEvents.emit(UIEventType.SHOW_TOOLTIP, {
            data: {
                kind: 'item',
                data: item,
                ...(heldAmountLabel ? { heldAmountLabel } : {}),
            },
            x: event.clientX,
            y: event.clientY,
        });
    };
    const handleMouseLeave = () => {
        uiEvents.emit(UIEventType.HIDE_TOOLTIP, {});
    };
    return (<button type="button" className={[
            'slot-item',
            'slot-item--filled',
            kindClass,
            npcHighValue ? 'slot-item--npc-high-value' : '',
            locked ? 'slot-item--locked' : '',
            pending ? 'slot-item--pending' : '',
        ].filter(Boolean).join(' ')} role="gridcell" data-inventory-slot={index} data-item-id={slot.itemId} data-context-menu-kind="inventory-slot" data-context-menu-target={contextMenuTarget} data-hud-fit-item data-hud-priority="5" aria-label={label} aria-busy={pending || undefined} disabled={pending} title={npcHighValue
            ? NPC_HIGH_VALUE_MARKETPLACE_HINT
            : locked
                ? 'Item bloqueado — transação bancária em andamento'
                : undefined} onClick={(event) => {
            event.preventDefault();
            onDiaryClick();
        }} onDoubleClick={(event) => {
            event.preventDefault();
            onEquipDoubleClick(slot.itemId);
        }} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <span className="slot-item__icon" aria-hidden="true">{abbrev}</span>
      {pending ? <span className="slot-item__pending" aria-hidden="true">⟳</span> : null}
      {!showCharges ? resolveQuantityBadge(slot, wallet) : null}
      {showCharges ? (<span className="slot-item__meta slot-item__meta--charges">
          {slot.charges ?? resolveStackDurabilityCharges({
                itemId: slot.itemId,
                quantity: slot.quantity,
            })}
        </span>) : null}
    </button>);
}
