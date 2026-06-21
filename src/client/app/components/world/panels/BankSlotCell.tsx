import type { MouseEvent } from 'react';
import type { InventorySlotState } from '../../../../../shared/character/inventorySlots.js';
import {
  isChargedInventoryStackItemId,
  resolveStackDurabilityCharges,
} from '../../../../../shared/items/chargedEquipment.js';
import {
  resolveInventoryItemAbbrev,
  resolveInventoryItemKindClass,
  resolveInventoryItemLabel,
} from '../../../../ui/inventory/inventoryItemDisplay.js';

type BankSlotCellProps = {
  readonly index: number;
  readonly slot: InventorySlotState;
  readonly source: 'inventory' | 'bank';
  readonly selected: boolean;
  readonly disabled: boolean;
  readonly onSelect: (source: 'inventory' | 'bank', index: number) => void;
  readonly onTooltipShow?: (event: MouseEvent, itemId: string) => void;
  readonly onTooltipHide?: () => void;
};

export function BankSlotCell({
  index,
  slot,
  source,
  selected,
  disabled,
  onSelect,
  onTooltipShow,
  onTooltipHide,
}: BankSlotCellProps) {
  if (!slot.itemId || slot.quantity <= 0) {
    return (
      <div
        className={`slot-item${selected ? ' slot-item--selected' : ''}`}
        role="gridcell"
        data-inventory-slot={index}
        data-hud-fit-item
        data-hud-priority="5"
        aria-label={`Slot vazio ${index + 1}`}
      />
    );
  }

  const itemId = slot.itemId;
  const label = resolveInventoryItemLabel(itemId);
  const abbrev = resolveInventoryItemAbbrev(itemId);
  const kindClass = resolveInventoryItemKindClass(itemId);
  const locked = (slot.lockedQuantity ?? 0) > 0;
  const showCharges = isChargedInventoryStackItemId(itemId);
  const charges = slot.charges ?? resolveStackDurabilityCharges({ itemId, quantity: slot.quantity });

  return (
    <button
      type="button"
      className={[
        'slot-item slot-item--filled slot-item--bank-select',
        kindClass,
        selected ? 'slot-item--selected' : '',
        locked ? 'slot-item--locked' : '',
      ].filter(Boolean).join(' ')}
      role="gridcell"
      data-inventory-slot={index}
      data-bank-select-slot={index}
      data-item-source={source}
      data-item-id={itemId}
      data-hud-fit-item
      data-hud-priority="5"
      aria-label={`${label}, quantidade ${slot.quantity}`}
      aria-pressed={selected}
      aria-disabled={disabled || locked || undefined}
      disabled={disabled}
      title={locked ? 'Item bloqueado — transação bancária em andamento' : undefined}
      onClick={() => {
        if (disabled || locked) return;
        onSelect(source, index);
      }}
      onMouseEnter={(event) => onTooltipShow?.(event, itemId)}
      onMouseLeave={() => onTooltipHide?.()}
    >
      <span className="slot-item__icon" aria-hidden="true">{abbrev}</span>
      {!showCharges && slot.quantity > 1 ? (
        <span className="slot-item__meta slot-item__meta--qty">{slot.quantity}</span>
      ) : null}
      {showCharges ? (
        <span className="slot-item__meta slot-item__meta--charges">{charges}</span>
      ) : null}
    </button>
  );
}
