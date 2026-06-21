import type { MouseEvent } from 'react';
import type { InventorySlotState } from '../../../../../shared/character/inventorySlots.js';
import {
  isChargedInventoryStackItemId,
  resolveStackDurabilityCharges,
} from '../../../../../shared/items/chargedEquipment.js';
import {
  isMarketplaceListableItem,
  isNpcVendorSellableItem,
} from '../../../../../shared/economy/itemValorEconomy.js';
import { NPC_HIGH_VALUE_MARKETPLACE_HINT } from '../../../../../shared/economy/npcSellRarityPolicy.js';
import type { GameStoreGold } from '../../../../state/GameStore.js';
import {
  resolveInventoryItemAbbrev,
  resolveInventoryItemKindClass,
  resolveInventoryItemLabel,
} from '../../../../ui/inventory/inventoryItemDisplay.js';
import {
  isWalletBackedCurrencyItemId,
  resolveWalletCurrencySlotQtyLabel,
} from '../../../../ui/inventory/inventoryCurrencyDisplay.js';

type InventorySlotCellProps = {
  index: number;
  slot: InventorySlotState;
  wallet: GameStoreGold;
  pending: boolean;
  vendorOpen: boolean;
  onClick?: (itemId: string) => void;
  onDoubleClick?: (itemId: string) => void;
  onContextMenu?: (event: MouseEvent, itemId: string) => void;
  onTooltipShow?: (event: MouseEvent, itemId: string) => void;
  onTooltipHide?: () => void;
};

function resolveQuantityLabel(
  slot: InventorySlotState,
  wallet: GameStoreGold,
): string | null {
  if (slot.itemId && isWalletBackedCurrencyItemId(slot.itemId)) {
    return resolveWalletCurrencySlotQtyLabel(slot.itemId, wallet) ?? null;
  }
  if (slot.quantity > 1) {
    return String(slot.quantity);
  }
  return null;
}

export function InventorySlotCell({
  index,
  slot,
  wallet,
  pending,
  vendorOpen,
  onClick,
  onDoubleClick,
  onContextMenu,
  onTooltipShow,
  onTooltipHide,
}: InventorySlotCellProps) {
  if (!slot.itemId || slot.quantity <= 0) {
    return (
      <div
        className="slot-item"
        role="gridcell"
        data-inventory-slot={index}
        aria-label={`Slot vazio ${index + 1}`}
      />
    );
  }

  const itemId = slot.itemId;
  const label = resolveInventoryItemLabel(itemId);
  const abbrev = resolveInventoryItemAbbrev(itemId);
  const kindClass = resolveInventoryItemKindClass(itemId);
  const npcHighValue =
    vendorOpen
    && isMarketplaceListableItem(itemId)
    && !isNpcVendorSellableItem(itemId);
  const locked = (slot.lockedQuantity ?? 0) > 0;
  const qtyLabel = resolveQuantityLabel(slot, wallet);
  const showCharges = isChargedInventoryStackItemId(itemId);
  const charges = slot.charges ?? resolveStackDurabilityCharges({
    itemId,
    quantity: slot.quantity,
  });

  return (
    <button
      type="button"
      className={[
        'slot-item slot-item--filled',
        kindClass,
        npcHighValue ? 'slot-item--npc-high-value' : '',
        locked ? 'slot-item--locked' : '',
        pending ? 'slot-item--pending' : '',
      ].filter(Boolean).join(' ')}
      role="gridcell"
      data-inventory-slot={index}
      data-item-id={itemId}
      aria-label={label}
      aria-busy={pending || undefined}
      disabled={pending}
      title={
        npcHighValue
          ? NPC_HIGH_VALUE_MARKETPLACE_HINT
          : locked
            ? 'Item bloqueado — transação bancária em andamento'
            : undefined
      }
      onClick={() => onClick?.(itemId)}
      onDoubleClick={() => onDoubleClick?.(itemId)}
      onContextMenu={(event) => onContextMenu?.(event, itemId)}
      onMouseEnter={(event) => onTooltipShow?.(event, itemId)}
      onMouseLeave={() => onTooltipHide?.()}
    >
      <span className="slot-item__icon" aria-hidden="true">{abbrev}</span>
      {pending ? <span className="slot-item__pending" aria-hidden="true">⟳</span> : null}
      {!showCharges && qtyLabel ? (
        <span className={`slot-item__meta slot-item__meta--qty${isWalletBackedCurrencyItemId(itemId) ? ' slot-item__meta--wallet' : ''}`}>
          {qtyLabel}
        </span>
      ) : null}
      {showCharges ? (
        <span className="slot-item__meta slot-item__meta--charges">{charges}</span>
      ) : null}
    </button>
  );
}
