import type { InventorySnapshot } from '../../../shared/character/inventorySlots.js';
import { ALQUIMISTA_NPC } from '../../../shared/world/npcBuildingAnchors.js';
import {
  filterLabListingsByTab,
  findNpcVendorListing,
  getNpcVendorListings,
  LAB_SHOP_TABS,
  type LabShopTabId,
  type NpcVendorListing,
} from '../../../shared/economy/npcVendorCatalog.js';
import {
  resolveEffectiveNpcBuyUnitPrice,
  resolveNpcPurchaseQuote,
} from '../../../shared/economy/npcVendorService.js';
import { formatVoltsShort } from '../../../shared/economy/premiumCurrency.js';
import type { WalletSnapshot } from '../../../shared/playerDataSnapshots.js';
import { getActionDispatcher } from '../../ActionDispatcher.js';
import { getDataStore } from '../../economy/economyLayer.js';
import {
  resolveInventoryItemAbbrev,
  resolveInventoryItemKindClass,
  resolveInventoryItemLabel,
} from '../inventory/inventoryItemDisplay.js';
import {
  buildConsumableShopEffectLines,
  resolveConsumableShopSubtitle,
} from '../vendor/consumableShopDisplay.js';
import {
  resolveLabQuantityPresets,
  resolveMaxLabPurchaseQuantity,
} from '../vendor/labPurchaseHelpers.js';
import { alertSystem } from '../alertSystem.js';
import { BaseUIComponent } from '../UIComponent.js';

export type LaboratoryShopContext = {
  readonly vendorId: string;
  readonly vendorName: string;
};

/** Loja do Laboratório — consumíveis (Poções, Runas, Livros) com compra em pilha. */
export class LaboratoryShopPanel extends BaseUIComponent {
  private readonly dataStore = getDataStore();
  private readonly dispatcher = getActionDispatcher();

  private vendor: LaboratoryShopContext = {
    vendorId: ALQUIMISTA_NPC,
    vendorName: 'Alquimista',
  };
  private wallet: WalletSnapshot = this.dataStore.getWallet();
  private inventory: InventorySnapshot = this.dataStore.getInventory();
  private activeTab: LabShopTabId = 'potions';
  private selectedItemId: string | null = null;
  private purchaseQuantity = 1;

  private unsubWallet: (() => void) | null = null;
  private unsubInventory: (() => void) | null = null;

  constructor() {
    super({
      id: 'laboratoryShop',
      rootClassName: 'ui-panel ui-panel--laboratory-shop ui-panel--movable',
    });
  }

  /** Painel largo com scroll interno — evita auto-scale que corta o rodapé de compra. */
  protected override shouldUseDynamicLayout(): boolean {
    return false;
  }

  openForVendor(context: LaboratoryShopContext): void {
    this.vendor = { ...context };
    this.activeTab = 'potions';
    this.selectedItemId = null;
    this.purchaseQuantity = 1;
    this.refreshSnapshots();
    this.render();
    this.open();
  }

  protected override onOpen(): void {
    this.refreshSnapshots();
    this.unsubWallet = this.dataStore.subscribe('wallet', (wallet) => {
      this.wallet = wallet;
      if (this.isOpen()) {
        this.updateWalletLabel();
        if (this.selectedItemId) this.updatePurchasePanel();
      }
    });
    this.unsubInventory = this.dataStore.subscribe('inventory', (inventory) => {
      this.inventory = inventory;
      if (this.isOpen() && this.selectedItemId) {
        this.updatePurchasePanel();
      }
    });
  }

  protected override onClose(): void {
    this.unsubWallet?.();
    this.unsubInventory?.();
    this.unsubWallet = null;
    this.unsubInventory = null;
    this.selectedItemId = null;
    this.purchaseQuantity = 1;
  }

  private refreshSnapshots(): void {
    this.wallet = this.dataStore.getWallet();
    this.inventory = this.dataStore.getInventory();
  }

  createTemplate(): string {
    const listings = filterLabListingsByTab(
      getNpcVendorListings(this.vendor.vendorId),
      this.activeTab,
    );
    const selectedListing =
      this.selectedItemId
        ? findNpcVendorListing(this.vendor.vendorId, this.selectedItemId)
        : null;

    return `
      <header class="ui-panel__header laboratory-shop__header" data-panel-drag-handle>
        <div class="laboratory-shop__header-main">
          <span class="laboratory-shop__tag">LABORATÓRIO // CONSUMÍVEIS</span>
          <h2 class="ui-panel__title laboratory-shop__title">${this.vendor.vendorName}</h2>
        </div>
        <button type="button" class="ui-panel__close" data-action="close" aria-label="Fechar laboratório">×</button>
      </header>
      <div class="ui-panel__body laboratory-shop__body">
        <p class="laboratory-shop__balance">
          Saldo: <strong data-lab-wallet>${this.wallet.voltsFormatted}</strong>
        </p>
        <p class="laboratory-shop__hint">
          Prepare-se antes da jornada — poções, runas e livros vão direto ao inventário e ao combate.
        </p>

        <nav class="laboratory-shop__tabs" aria-label="Categorias do laboratório">
          ${LAB_SHOP_TABS.map((tab) => this.renderTabButton(tab.id, tab.label)).join('')}
        </nav>

        <div class="laboratory-shop__layout">
          <section class="laboratory-shop__catalog" aria-label="Catálogo">
            <div class="laboratory-shop__list-head" aria-hidden="true">
              <span class="laboratory-shop__col laboratory-shop__col--item">Item</span>
              <span class="laboratory-shop__col laboratory-shop__col--price">Preço</span>
            </div>
            <ul class="laboratory-shop__list">
              ${listings.length > 0
                ? listings.map((listing) => this.renderListingRow(listing)).join('')
                : '<li class="ui-empty">Nenhum item nesta categoria.</li>'}
            </ul>
          </section>

          <aside class="laboratory-shop__detail" aria-label="Detalhes e compra">
            ${selectedListing
              ? this.renderPurchasePanel(selectedListing)
              : this.renderDetailIdle()}
          </aside>
        </div>
      </div>
    `;
  }

  private renderTabButton(tabId: LabShopTabId, label: string): string {
    const active = this.activeTab === tabId;
    return `
      <button
        type="button"
        class="laboratory-shop__tab${active ? ' is-active' : ''}"
        data-lab-tab="${tabId}"
        aria-pressed="${active ? 'true' : 'false'}"
      >
        ${label}
      </button>
    `;
  }

  private renderDetailIdle(): string {
    return `
      <div class="laboratory-shop__detail-inner laboratory-shop__detail-inner--idle">
        <span class="laboratory-shop__detail-tag">PREPARO::IDLE</span>
        <p class="laboratory-shop__detail-idle">
          Selecione um consumível para ver efeitos e comprar em pilha.
        </p>
      </div>
    `;
  }

  private renderPurchasePanel(listing: NpcVendorListing): string {
    const label = resolveInventoryItemLabel(listing.itemId);
    const abbrev = resolveInventoryItemAbbrev(listing.itemId);
    const kindClass = resolveInventoryItemKindClass(listing.itemId);
    const effectLines = buildConsumableShopEffectLines(listing.itemId);
    const subtitle = resolveConsumableShopSubtitle(listing.itemId);
    const owned = this.countInventoryItem(listing.itemId);
    const buyUnit = resolveEffectiveNpcBuyUnitPrice(listing.itemId, listing) ?? 0;
    const maxQty = resolveMaxLabPurchaseQuantity(
      listing.itemId,
      this.inventory,
      this.wallet.dollarVolt,
      buyUnit,
    );
    const qty = Math.min(this.purchaseQuantity, maxQty);
    const quote = resolveNpcPurchaseQuote(listing, qty);
    const total = quote?.totalVolts ?? buyUnit * qty;
    const presets = resolveLabQuantityPresets(maxQty);
    const stackable = maxQty > 1 || presets.length > 1;

    return `
      <div class="laboratory-shop__detail-inner laboratory-shop__detail-inner--active ${kindClass}">
        <span class="laboratory-shop__detail-tag">PREPARO::${this.activeTab.toUpperCase()}</span>
        <div class="laboratory-shop__item-head">
          <span class="laboratory-shop__item-icon">${abbrev}</span>
          <div class="laboratory-shop__item-meta">
            <p class="laboratory-shop__item-name">${label}</p>
            ${subtitle ? `<p class="laboratory-shop__item-sub">${subtitle}</p>` : ''}
            <p class="laboratory-shop__item-owned">No inventário: ×${owned}</p>
          </div>
        </div>

        <div class="laboratory-shop__effects" aria-label="Efeitos">
          <h4 class="laboratory-shop__effects-title">Efeitos</h4>
          <ul class="laboratory-shop__effects-list">
            ${effectLines.map((line) => `<li>${line}</li>`).join('')}
          </ul>
        </div>

        <div class="laboratory-shop__purchase">
          <p class="laboratory-shop__unit-price">
            Preço unitário: <strong>${formatVoltsShort(buyUnit)}</strong>
          </p>

          ${stackable
            ? `
              <div class="laboratory-shop__qty-presets" aria-label="Quantidade rápida">
                ${presets.map((preset) => `
                  <button
                    type="button"
                    class="laboratory-shop__qty-preset${qty === preset ? ' is-active' : ''}"
                    data-lab-qty-preset="${preset}"
                  >×${preset}</button>
                `).join('')}
              </div>
            `
            : ''}

          <label class="laboratory-shop__qty">
            <span class="laboratory-shop__qty-label">Quantidade</span>
            <input
              type="range"
              min="1"
              max="${maxQty}"
              step="1"
              class="laboratory-shop__qty-slider"
              data-lab-qty-slider
              value="${qty}"
            />
            <input
              type="number"
              min="1"
              max="${maxQty}"
              step="1"
              class="laboratory-shop__qty-input"
              data-lab-qty
              value="${qty}"
            />
          </label>
          <p class="laboratory-shop__qty-cap">Máximo: ×${maxQty}</p>

          <button
            type="button"
            class="laboratory-shop__buy-btn"
            data-action="confirm-purchase"
            ${maxQty >= 1 && this.wallet.dollarVolt >= total ? '' : 'disabled'}
          >
            Comprar <strong data-lab-buy-total>${formatVoltsShort(total)}</strong>
          </button>
        </div>
      </div>
    `;
  }

  private renderListingRow(listing: NpcVendorListing): string {
    const selected = this.selectedItemId === listing.itemId;
    const kindClass = resolveInventoryItemKindClass(listing.itemId);
    const label = resolveInventoryItemLabel(listing.itemId);
    const abbrev = resolveInventoryItemAbbrev(listing.itemId);
    const subtitle = resolveConsumableShopSubtitle(listing.itemId);
    const buyUnit = resolveEffectiveNpcBuyUnitPrice(listing.itemId, listing) ?? 0;

    return `
      <li>
        <button
          type="button"
          class="laboratory-shop__row ${kindClass}${selected ? ' is-selected' : ''}"
          data-select-lab-item="${listing.itemId}"
          aria-pressed="${selected ? 'true' : 'false'}"
        >
          <span class="laboratory-shop__col laboratory-shop__col--item">
            <span class="laboratory-shop__icon" aria-hidden="true">${abbrev}</span>
            <span class="laboratory-shop__item-text">
              <span class="laboratory-shop__name">${label}</span>
              ${subtitle ? `<span class="laboratory-shop__row-sub">${subtitle}</span>` : ''}
            </span>
          </span>
          <span class="laboratory-shop__col laboratory-shop__col--price">
            <span class="laboratory-shop__price">${formatVoltsShort(buyUnit)}</span>
          </span>
        </button>
      </li>
    `;
  }

  private countInventoryItem(itemId: string): number {
    let total = 0;
    for (const slot of this.inventory.slots) {
      if (slot.itemId === itemId && slot.quantity > 0) {
        total += slot.quantity;
      }
    }
    return total;
  }

  private updateWalletLabel(): void {
    const el = this.query<HTMLElement>('[data-lab-wallet]');
    if (el) el.textContent = this.wallet.voltsFormatted;
  }

  private updatePurchasePanel(): void {
    if (!this.selectedItemId) return;
    const listing = findNpcVendorListing(this.vendor.vendorId, this.selectedItemId);
    if (!listing) return;

    const buyUnit = resolveEffectiveNpcBuyUnitPrice(listing.itemId, listing) ?? 0;
    const maxQty = resolveMaxLabPurchaseQuantity(
      listing.itemId,
      this.inventory,
      this.wallet.dollarVolt,
      buyUnit,
    );
    this.purchaseQuantity = Math.max(1, Math.min(this.purchaseQuantity, maxQty));

    const detail = this.query<HTMLElement>('.laboratory-shop__detail');
    if (detail) {
      detail.innerHTML = this.renderPurchasePanel(listing);
    }
  }

  private clampPurchaseQuantity(listing: NpcVendorListing): void {
    const buyUnit = resolveEffectiveNpcBuyUnitPrice(listing.itemId, listing) ?? 0;
    const maxQty = resolveMaxLabPurchaseQuantity(
      listing.itemId,
      this.inventory,
      this.wallet.dollarVolt,
      buyUnit,
    );
    this.purchaseQuantity = Math.max(1, Math.min(Math.floor(this.purchaseQuantity), maxQty));
  }

  protected override bindEvents(): void {
    this.root?.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;

      if (target.dataset.action === 'close') {
        this.close();
        return;
      }

      const tabBtn = target.closest<HTMLElement>('[data-lab-tab]');
      if (tabBtn) {
        const tab = tabBtn.dataset.labTab as LabShopTabId | undefined;
        if (tab && tab !== this.activeTab) {
          this.activeTab = tab;
          this.selectedItemId = null;
          this.purchaseQuantity = 1;
          this.render();
        }
        return;
      }

      const row = target.closest<HTMLElement>('[data-select-lab-item]');
      if (row) {
        this.selectedItemId = row.dataset.selectLabItem ?? null;
        this.purchaseQuantity = 1;
        this.render();
        return;
      }

      const presetBtn = target.closest<HTMLElement>('[data-lab-qty-preset]');
      if (presetBtn && this.selectedItemId) {
        const listing = findNpcVendorListing(this.vendor.vendorId, this.selectedItemId);
        if (!listing) return;
        this.purchaseQuantity = Math.max(1, Number(presetBtn.dataset.labQtyPreset) || 1);
        this.clampPurchaseQuantity(listing);
        this.updatePurchasePanel();
        return;
      }

      if (target.dataset.action === 'confirm-purchase') {
        this.dispatchPurchase();
      }
    });

    this.root?.addEventListener('input', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement) || !this.selectedItemId) return;

      const listing = findNpcVendorListing(this.vendor.vendorId, this.selectedItemId);
      if (!listing) return;

      if (target.matches('[data-lab-qty], [data-lab-qty-slider]')) {
        this.purchaseQuantity = Math.max(1, Math.floor(Number(target.value) || 1));
        this.clampPurchaseQuantity(listing);

        const qtyInput = this.query<HTMLInputElement>('[data-lab-qty]');
        const qtySlider = this.query<HTMLInputElement>('[data-lab-qty-slider]');
        if (qtyInput) qtyInput.value = String(this.purchaseQuantity);
        if (qtySlider) qtySlider.value = String(this.purchaseQuantity);

        const quote = resolveNpcPurchaseQuote(listing, this.purchaseQuantity);
        const totalEl = this.query<HTMLElement>('[data-lab-buy-total]');
        if (totalEl && quote) {
          totalEl.textContent = formatVoltsShort(quote.totalVolts);
        }

        const buyBtn = this.query<HTMLButtonElement>('[data-action="confirm-purchase"]');
        if (buyBtn) {
          buyBtn.disabled = this.wallet.dollarVolt < (quote?.totalVolts ?? 0);
        }
      }
    });
  }

  private dispatchPurchase(): void {
    if (!this.selectedItemId) return;

    const result = this.dispatcher.dispatch({
      type: 'PURCHASE_NPC_ITEM',
      payload: {
        vendorId: this.vendor.vendorId,
        itemId: this.selectedItemId,
        quantity: this.purchaseQuantity,
      },
    });

    if (!result.ok) {
      alertSystem(result.reason);
      return;
    }

    if (result.status === 'applied') {
      this.purchaseQuantity = 1;
      this.updatePurchasePanel();
    }
  }
}
