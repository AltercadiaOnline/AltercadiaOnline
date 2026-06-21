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
import { renderInventorySlot } from '../inventory/renderInventorySlot.js';
import {
  isWalletBackedCurrencyItemId,
} from '../inventory/inventoryCurrencyDisplay.js';
import {
  isMarketplaceListableItem,
  isNpcVendorSellableItem,
} from '../../../shared/economy/itemValorEconomy.js';
import { NPC_HIGH_VALUE_MARKETPLACE_HINT } from '../../../shared/economy/npcSellRarityPolicy.js';
import { uiEvents, UIEventType } from '../uiEvents.js';
import { isNpcVendorShopOpen, subscribeNpcVendorShopOpen } from '../vendor/npcVendorSession.js';
import { getContextMenuService } from '../contextMenu/ContextMenuService.js';
import {
  closeReactMovablePanel,
  focusReactMovablePanel,
  isReactMovablePanelEnabled,
  openReactMovablePanel,
} from '../../app/panels/reactMovablePanelBridge.js';
import { subscribeGameStore } from '../../state/GameStore.js';
import type { GameStoreGold } from '../../state/GameStore.js';
import {
  InventoryService,
  isSyncPending,
  selectInventorySlotTooltipLabel,
  selectInventorySyncIndicatorHtml,
  selectPlayerGold,
  selectPlayerInventory,
} from '../../services/index.js';

export type InventoryItemView = {
  readonly id: string;
  readonly name: string;
  readonly quantity: number;
};

/**
 * Inventário — grade wide MMO (10×4 = 40).
 * Sem cache de itens: createTemplate() lê GameStore.player a cada render.
 */
export class InventoryPanel extends BaseUIComponent {
  private unsubscribeGameStore: (() => void) | null = null;
  private unsubNpcVendor: (() => void) | null = null;
  private unbindTooltipListeners: (() => void) | null = null;
  private unbindDismissContextMenu: (() => void) | null = null;

  constructor() {
    super({ id: 'inventory', rootClassName: 'ui-panel ui-panel--inventory ui-panel--movable' });

    this.unsubscribeGameStore = subscribeGameStore((_, slice) => {
      if (slice !== 'player' && slice !== 'pendingActions' && slice !== '*') return;
      if (this.isOpen()) this.render();
    });

    this.unsubNpcVendor = subscribeNpcVendorShopOpen(() => {
      if (this.isOpen()) this.render();
    });
  }

  override mount(parent: HTMLElement): void {
    if (isReactMovablePanelEnabled()) return;
    super.mount(parent);
  }

  override open(): void {
    if (openReactMovablePanel(this, 'inventory')) return;
    super.open();
  }

  override close(): void {
    if (closeReactMovablePanel(this, 'inventory')) return;
    super.close();
  }

  override focus(): void {
    if (focusReactMovablePanel(this, 'inventory')) return;
    super.focus();
  }

  override getRootElement(): HTMLElement | null {
    if (isReactMovablePanelEnabled()) return null;
    return super.getRootElement();
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
    const inventory = selectPlayerInventory();
    const syncIndicator = selectInventorySyncIndicatorHtml();

    const slotsHtml = inventory.slots
      .map((slot, index) => this.renderSlot(index, slot, selectPlayerGold()))
      .join('');

    return `
      <header class="ui-panel__header inventory-panel__header" data-panel-drag-handle>
        <div class="inventory-panel__header-main">
          <h2 class="ui-panel__title">Inventário</h2>
          <p class="inventory-panel__meta" data-hud-fit-secondary>
            ${inventory.used} / ${inventory.capacity} slots
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
      if (InventoryService.isInventoryMutationPending()) return;

      const slotEl = (event.target as HTMLElement).closest<HTMLElement>('[data-item-id]');
      const itemId = slotEl?.dataset.itemId;
      if (!itemId) return;
      if (!InventoryService.canEquipItem(itemId)) return;
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
    this.unsubscribeGameStore?.();
    this.unsubscribeGameStore = null;
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
    wallet: GameStoreGold,
  ): string {
    const pending = isSyncPending() && Boolean(slot.itemId);

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
