import {
  INVENTORY_GRID_COLUMNS,
  INVENTORY_GRID_ROWS,
  INVENTORY_SLOT_COUNT,
  type InventorySlotState,
} from '../../../shared/character/inventorySlots.js';
import { getItemById } from '../../../shared/items/itemCatalog.js';
import { DIARIO_MEMORIAS_ITEM_ID } from '../../../shared/items/soulboundItems.js';
import { BaseUIComponent } from '../UIComponent.js';
import { openDiaryPanel } from '../diary/openDiaryPanel.js';
import { dispatchEquipFromInventory } from '../equipment/equipItemAction.js';
import { findCompatibleEquipmentSlot } from '../equipment/inventoryEquip.js';
import { renderInventorySlot } from '../inventory/renderInventorySlot.js';
import {
  isWalletBackedCurrencyItemId,
  resolveWalletCurrencySlotQtyLabel,
  type WalletCurrencyView,
} from '../inventory/inventoryCurrencyDisplay.js';
import { getPlayerItemStore } from '../items/playerItemStore.js';
import {
  hasPendingItemMutation,
  isInventoryItemMutationPending,
  subscribeItemMutationPending,
} from '../items/itemMutationPendingUi.js';
import {
  isMarketplaceListableItem,
  isNpcVendorSellableItem,
} from '../../../shared/economy/itemValorEconomy.js';
import { NPC_HIGH_VALUE_MARKETPLACE_HINT } from '../../../shared/economy/npcSellRarityPolicy.js';
import { uiEvents, UIEventType } from '../uiEvents.js';
import { isNpcVendorShopOpen, subscribeNpcVendorShopOpen } from '../vendor/npcVendorSession.js';
import { getContextMenuService } from '../contextMenu/ContextMenuService.js';
import { getDataStore } from '../../economy/economyLayer.js';

export type InventoryItemView = {
  readonly id: string;
  readonly name: string;
  readonly quantity: number;
};

/**
 * Inventário — grade wide MMO (10×4 = 40).
 * Sem cache de itens: createTemplate() lê playerItemStore a cada render.
 */
export class InventoryPanel extends BaseUIComponent {
  private unsubscribeStore: (() => void) | null = null;
  private unsubscribeWallet: (() => void) | null = null;
  private unsubscribePending: (() => void) | null = null;
  private unsubNpcVendor: (() => void) | null = null;
  private unbindTooltipListeners: (() => void) | null = null;
  private unbindDismissContextMenu: (() => void) | null = null;

  constructor() {
    super({ id: 'inventory', rootClassName: 'ui-panel ui-panel--inventory ui-panel--movable' });

    const itemStore = getPlayerItemStore();
    this.unsubscribeStore = itemStore.subscribe(() => {
      if (this.isOpen()) this.render();
    });

    this.unsubscribeWallet = getDataStore().subscribe('wallet', () => {
      if (this.isOpen()) this.render();
    });

    this.unsubscribePending = subscribeItemMutationPending(() => {
      if (this.isOpen()) this.render();
    });

    this.unsubNpcVendor = subscribeNpcVendorShopOpen(() => {
      if (this.isOpen()) this.render();
    });
  }

  /** @deprecated Prefer seeding via servidor / demo bootstrap */
  setItems(items: readonly InventoryItemView[]): void {
    void items;
  }

  protected override onOpen(): void {
    this.render();
  }

  override render(): void {
    super.render();
  }

  createTemplate(): string {
    const snapshot = getPlayerItemStore().getInventorySnapshot();
    const wallet = getDataStore().getWallet();
    const syncIndicator = hasPendingItemMutation()
      ? '<span class="inventory-panel__sync" aria-busy="true" title="Sincronizando equipamento…">⟳</span>'
      : '';

    const slotsHtml = snapshot.slots
      .map((slot, index) => this.renderSlot(index, slot, wallet))
      .join('');

    return `
      <header class="ui-panel__header inventory-panel__header" data-panel-drag-handle>
        <div class="inventory-panel__header-main">
          <h2 class="ui-panel__title">Inventário</h2>
          <p class="inventory-panel__meta" data-hud-fit-secondary>
            ${snapshot.used} / ${snapshot.capacity} slots
            ${syncIndicator}
          </p>
        </div>
        <button type="button" class="ui-panel__close" data-action="close" aria-label="Fechar Inventário">×</button>
      </header>
      <div class="ui-panel__body ui-panel__body--inventory">
        <div class="inventory-panel__frame" data-hud-fit-root>
          <div
            class="inventory-grid"
            role="grid"
            aria-label="Inventário"
            style="--inventory-cols: ${INVENTORY_GRID_COLUMNS}; --inventory-rows: ${INVENTORY_GRID_ROWS}"
          >
            ${slotsHtml}
          </div>
        </div>
      </div>
    `;
  }

  protected override bindEvents(): void {
    this.bindDismissContextMenuOnLeftClick();

    this.root?.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;

      if (target.dataset.action === 'close') {
        this.close();
        return;
      }

      const slotEl = target.closest<HTMLElement>('[data-item-id]');
      const itemId = slotEl?.dataset.itemId;
      if (itemId === DIARIO_MEMORIAS_ITEM_ID) {
        event.preventDefault();
        openDiaryPanel();
      }
    });

    this.root?.addEventListener('dblclick', (event) => {
      if (hasPendingItemMutation()) return;

      const slotEl = (event.target as HTMLElement).closest<HTMLElement>('[data-item-id]');
      const itemId = slotEl?.dataset.itemId;
      if (!itemId) return;
      if (isInventoryItemMutationPending(itemId)) return;
      if (!findCompatibleEquipmentSlot(itemId)) return;
      event.preventDefault();
      dispatchEquipFromInventory(itemId);
    });
  }

  private bindDismissContextMenuOnLeftClick(): void {
    const dismiss = (event: MouseEvent): void => {
      if (event.button !== 0) return;
      getContextMenuService().close();
    };

    this.root?.addEventListener('mousedown', dismiss);
    this.unbindDismissContextMenu = () => {
      this.root?.removeEventListener('mousedown', dismiss);
    };
  }

  override destroy(): void {
    this.unbindTooltipListeners?.();
    this.unbindTooltipListeners = null;
    this.unbindDismissContextMenu?.();
    this.unbindDismissContextMenu = null;
    this.unsubNpcVendor?.();
    this.unsubNpcVendor = null;
    this.unsubscribePending?.();
    this.unsubscribePending = null;
    this.unsubscribeWallet?.();
    this.unsubscribeWallet = null;
    this.unsubscribeStore?.();
    this.unsubscribeStore = null;
    super.destroy();
  }

  protected override afterRender(): void {
    this.unbindTooltipListeners?.();
    if (!this.root) return;

    const slots = this.root.querySelectorAll<HTMLElement>('[data-item-id]');
    const cleanups: Array<() => void> = [];

    for (const slot of slots) {
      const onEnter = (event: MouseEvent): void => {
        const itemId = slot.dataset.itemId;
        if (!itemId) return;

        const item = getItemById(itemId);
        if (!item) return;

        if (
          isNpcVendorShopOpen()
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

        const wallet = getDataStore().getWallet();
        const heldAmountLabel = isWalletBackedCurrencyItemId(itemId)
          ? resolveWalletCurrencySlotQtyLabel(itemId, wallet) ?? undefined
          : undefined;

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

      const onLeave = (): void => {
        uiEvents.emit(UIEventType.HIDE_TOOLTIP, {});
      };

      slot.addEventListener('mouseenter', onEnter);
      slot.addEventListener('mouseleave', onLeave);
      cleanups.push(() => {
        slot.removeEventListener('mouseenter', onEnter);
        slot.removeEventListener('mouseleave', onLeave);
      });
    }

    this.unbindTooltipListeners = () => {
      for (const off of cleanups) off();
      uiEvents.emit(UIEventType.HIDE_TOOLTIP, {});
    };
  }

  private renderSlot(
    index: number,
    slot: InventorySlotState,
    wallet: WalletCurrencyView,
  ): string {
    const pending = slot.itemId
      ? isInventoryItemMutationPending(slot.itemId)
      : false;

    return renderInventorySlot({
      index,
      slot,
      context: 'player-inventory',
      pending,
      wallet,
    });
  }
}

export { INVENTORY_SLOT_COUNT };
