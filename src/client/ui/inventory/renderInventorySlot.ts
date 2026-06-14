import {
  isChargedInventoryStackItemId,
  resolveStackDurabilityCharges,
} from '../../../shared/items/chargedEquipment.js';
import type { InventorySlotState } from '../../../shared/character/inventorySlots.js';
import {
  isMarketplaceListableItem,
  isNpcVendorSellableItem,
} from '../../../shared/economy/itemValorEconomy.js';
import { NPC_HIGH_VALUE_MARKETPLACE_HINT } from '../../../shared/economy/npcSellRarityPolicy.js';
import { isNpcVendorShopOpen } from '../vendor/npcVendorSession.js';
import {
  resolveInventoryItemAbbrev,
  resolveInventoryItemKindClass,
  resolveInventoryItemLabel,
} from './inventoryItemDisplay.js';
import {
  isWalletBackedCurrencyItemId,
  resolveWalletCurrencySlotQtyLabel,
  type WalletCurrencyView,
} from './inventoryCurrencyDisplay.js';

export type InventorySlotRenderContext =
  | 'player-inventory'
  | 'bank-inventory'
  | 'bank-vault';

export type RenderInventorySlotParams = {
  readonly index: number;
  readonly slot: InventorySlotState;
  readonly context: InventorySlotRenderContext;
  readonly selected?: boolean;
  /** WS aguardando confirmação de equip/desequip (modo online). */
  readonly pending?: boolean;
  /** Saldo da carteira — espelha badge de moedas (DV / ALTER COINS) nas HUDs. */
  readonly wallet?: WalletCurrencyView;
};

function resolveQuantityBadge(
  slot: InventorySlotState,
  context: InventorySlotRenderContext,
  wallet?: WalletCurrencyView,
): string {
  if (
    context === 'player-inventory'
    && slot.itemId
    && wallet
    && isWalletBackedCurrencyItemId(slot.itemId)
  ) {
    const label = resolveWalletCurrencySlotQtyLabel(slot.itemId, wallet);
    if (label) {
      return `<span class="slot-item__meta slot-item__meta--qty slot-item__meta--wallet">${label}</span>`;
    }
  }

  if (slot.quantity > 1) {
    return `<span class="slot-item__meta slot-item__meta--qty">${slot.quantity}</span>`;
  }

  return '';
}

/**
 * HTML de um slot de item — classe global `slot-item` (inventário, banco, lojas).
 */
export function renderInventorySlot(params: RenderInventorySlotParams): string {
  const { index, slot, context, selected = false, pending = false, wallet } = params;
  const selectedClass = selected ? ' slot-item--selected' : '';
  const pendingClass = pending ? ' slot-item--pending' : '';
  const pendingAttrs = pending ? ' aria-busy="true" disabled' : '';

  if (!slot.itemId || slot.quantity <= 0) {
    return `
      <div
        class="slot-item${selectedClass}"
        role="gridcell"
        data-inventory-slot="${index}"
        data-hud-fit-item
        data-hud-priority="5"
        aria-label="Slot vazio ${index + 1}"
      ></div>
    `;
  }

  const label = resolveInventoryItemLabel(slot.itemId);
  const abbrev = resolveInventoryItemAbbrev(slot.itemId);
  const kindClass = resolveInventoryItemKindClass(slot.itemId);

  const npcHighValue =
    context === 'player-inventory'
    && isNpcVendorShopOpen()
    && isMarketplaceListableItem(slot.itemId)
    && !isNpcVendorSellableItem(slot.itemId);

  const highValueClass = npcHighValue ? ' slot-item--npc-high-value' : '';
  const highValueTitle = npcHighValue ? ` title="${NPC_HIGH_VALUE_MARKETPLACE_HINT}"` : '';
  const locked = (slot.lockedQuantity ?? 0) > 0;
  const lockedClass = locked ? ' slot-item--locked' : '';
  const lockedTitle = locked ? ' title="Item bloqueado — transação bancária em andamento"' : '';

  const qtyBadge = resolveQuantityBadge(slot, context, wallet);

  const showCharges =
    Boolean(slot.itemId && isChargedInventoryStackItemId(slot.itemId));

  const chargesBadge = showCharges
    ? `<span class="slot-item__meta slot-item__meta--charges">${slot.charges ?? resolveStackDurabilityCharges({ itemId: slot.itemId!, quantity: slot.quantity })}</span>`
    : '';

  const stackQtyBadge = showCharges ? '' : qtyBadge;

  if (context === 'player-inventory') {
    const contextMenuTarget = JSON.stringify({ slotIndex: index, itemId: slot.itemId });
    return `
      <button
        type="button"
        class="slot-item slot-item--filled ${kindClass}${highValueClass}${lockedClass}${pendingClass}${selectedClass}"
        role="gridcell"
        data-inventory-slot="${index}"
        data-item-id="${slot.itemId}"
        data-context-menu-kind="inventory-slot"
        data-context-menu-target='${contextMenuTarget}'
        data-hud-fit-item
        data-hud-priority="5"
        aria-label="${label}"${highValueTitle}${lockedTitle}${pendingAttrs}
      >
        <span class="slot-item__icon" aria-hidden="true">${abbrev}</span>
        ${pending ? '<span class="slot-item__pending" aria-hidden="true">⟳</span>' : ''}
        ${stackQtyBadge}
        ${chargesBadge}
      </button>
    `;
  }

  const source = context === 'bank-vault' ? 'bank' : 'inventory';

  return `
    <button
      type="button"
      class="slot-item slot-item--filled slot-item--bank-select ${kindClass}${selectedClass}"
      role="gridcell"
      data-inventory-slot="${index}"
      data-bank-select-slot="${index}"
      data-item-source="${source}"
      data-item-id="${slot.itemId}"
      data-hud-fit-item
      data-hud-priority="5"
      aria-label="${label}, quantidade ${slot.quantity}"
      aria-pressed="${selected ? 'true' : 'false'}"
    >
      <span class="slot-item__icon" aria-hidden="true">${abbrev}</span>
      ${stackQtyBadge}
      ${chargesBadge}
    </button>
  `;
}
