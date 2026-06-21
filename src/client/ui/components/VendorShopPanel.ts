import type { InventorySnapshot } from '../../../shared/character/inventorySlots.js';
import { resolveItemValorBase } from '../../../shared/economy/itemValorEconomy.js';
import { VENDEDOR_NPC } from '../../../shared/world/npcBuildingAnchors.js';
import {
  findNpcVendorListing,
  getNpcVendorListings,
  resolveNpcPriceSpread,
  type NpcVendorListing,
} from '../../../shared/economy/npcVendorCatalog.js';
import {
  resolveEffectiveNpcBuyUnitPrice,
  resolveEffectiveNpcSellUnitPrice,
  resolveInventoryItemSellQuote,
  resolveNpcPurchaseQuote,
  resolveNpcSellQuote,
} from '../../../shared/economy/npcVendorService.js';
import { formatVoltsShort } from '../../../shared/economy/premiumCurrency.js';
import { resolveNpcVendorRarityBlockReason } from '../../../shared/economy/npcSellRarityPolicy.js';
import type { WalletSnapshot } from '../../../shared/playerDataSnapshots.js';
import { getActionDispatcher } from '../../ActionDispatcher.js';
import {
  ActionGatewayButtonController,
  type ActionGatewayButtonOptions,
} from './ActionGatewayButton.js';
import { getDataStore } from '../../economy/economyLayer.js';
import {
  resolveInventoryItemAbbrev,
  resolveInventoryItemKindClass,
  resolveInventoryItemLabel,
} from '../inventory/inventoryItemDisplay.js';
import {
  listInventoryNpcBlockedRows,
  listInventorySellRows,
  type InventoryNpcBlockedRow,
  type InventorySellRow,
} from '../vendor/inventorySellRows.js';
import { setNpcVendorShopOpen } from '../vendor/npcVendorSession.js';
import { alertSystem } from '../alertSystem.js';
import { BaseUIComponent } from '../UIComponent.js';
import {
  closeReactMovablePanel,
  focusReactMovablePanel,
  isReactMovablePanelEnabled,
  openReactMovablePanel,
} from '../../app/panels/reactMovablePanelBridge.js';
import { tryOpenReactWorldPanel } from '../../app/panels/initWorldPanelsBridge.js';

export type VendorShopContext = {
  readonly vendorId: string;
  readonly vendorName: string;
};

type VendorTradeMode = 'catalog' | 'inventory';

/** Loja NPC — compra de suprimentos + revenda de loot via valorBase. */
export class VendorShopPanel extends BaseUIComponent {
  private readonly dataStore = getDataStore();
  private readonly dispatcher = getActionDispatcher();

  private vendor: VendorShopContext = { vendorId: VENDEDOR_NPC, vendorName: 'Vendedor' };
  private wallet: WalletSnapshot = this.dataStore.getWallet();
  private inventory: InventorySnapshot = this.dataStore.getInventory();
  private selectedItemId: string | null = null;
  private tradeMode: VendorTradeMode = 'catalog';
  private tradeQuantity = 1;

  private unsubWallet: (() => void) | null = null;
  private unsubInventory: (() => void) | null = null;
  private readonly purchaseGateway = new ActionGatewayButtonController(
    () => this.buildPurchaseGatewayOptions(),
  );
  private readonly sellGateway = new ActionGatewayButtonController(
    () => this.buildSellGatewayOptions(),
  );

  constructor() {
    super({
      id: 'vendorShop',
      rootClassName: 'ui-panel ui-panel--vendor-shop ui-panel--movable',
    });
  }

  override mount(parent: HTMLElement): void {
    if (isReactMovablePanelEnabled()) return;
    super.mount(parent);
  }

  override open(): void {
    if (openReactMovablePanel(this, 'vendorShop')) return;
    super.open();
  }

  override close(): void {
    if (closeReactMovablePanel(this, 'vendorShop')) return;
    super.close();
  }

  override focus(): void {
    if (focusReactMovablePanel(this, 'vendorShop')) return;
    super.focus();
  }

  override getRootElement(): HTMLElement | null {
    if (isReactMovablePanelEnabled()) return null;
    return super.getRootElement();
  }

  openForVendor(context: VendorShopContext): void {
    if (tryOpenReactWorldPanel('vendorShop', {
      kind: 'vendorShop',
      vendorId: context.vendorId,
      vendorName: context.vendorName,
    })) {
      return;
    }

    this.vendor = { ...context };
    this.selectedItemId = null;
    this.tradeMode = 'catalog';
    this.tradeQuantity = 1;
    this.refreshSnapshots();
    this.render();
    this.open();
  }

  protected override onOpen(): void {
    setNpcVendorShopOpen(true);
    this.refreshSnapshots();
    this.unsubWallet = this.dataStore.subscribe('wallet', (wallet) => {
      this.wallet = wallet;
      if (this.isOpen()) this.updateWalletLabel();
    });
    this.unsubInventory = this.dataStore.subscribe('inventory', (inventory) => {
      this.inventory = inventory;
      if (this.isOpen() && this.selectedItemId) {
        this.updateTradeTotals();
        if (this.tradeMode === 'inventory') this.render();
      }
    });
  }

  protected override afterRender(): void {
    this.purchaseGateway.attach(
      this.query<HTMLButtonElement>('[data-action="confirm-purchase"]'),
    );
    this.sellGateway.attach(
      this.query<HTMLButtonElement>('[data-action="confirm-sell"]'),
    );
  }

  protected override getDynamicLayoutOptions() {
    return {
      fitRootSelector: '.vendor-shop__body',
      itemSelector: '[data-hud-fit-item]',
      secondarySelector: '[data-hud-fit-secondary]',
      minVisibleItems: 3,
    };
  }

  protected override onClose(): void {
    setNpcVendorShopOpen(false);
    this.unsubWallet?.();
    this.unsubInventory?.();
    this.unsubWallet = null;
    this.unsubInventory = null;
    this.purchaseGateway.detach();
    this.sellGateway.detach();
    this.selectedItemId = null;
    this.tradeMode = 'catalog';
    this.tradeQuantity = 1;
  }

  private refreshSnapshots(): void {
    this.wallet = this.dataStore.getWallet();
    this.inventory = this.dataStore.getInventory();
  }

  createTemplate(): string {
    const listings = getNpcVendorListings(this.vendor.vendorId);
    const inventoryRows = listInventorySellRows(this.inventory);
    const blockedRows = listInventoryNpcBlockedRows(this.inventory);
    const selectedListing =
      this.tradeMode === 'catalog' && this.selectedItemId
        ? findNpcVendorListing(this.vendor.vendorId, this.selectedItemId)
        : null;
    const selectedInventoryRow =
      this.tradeMode === 'inventory' && this.selectedItemId
        ? inventoryRows.find((row) => row.itemId === this.selectedItemId) ?? null
        : null;

    return `
      <header class="ui-panel__header vendor-shop__header" data-panel-drag-handle>
        <div class="vendor-shop__header-main">
          <span class="vendor-shop__tag">LOJA NPC // SUPRIMENTOS</span>
          <h2 class="ui-panel__title vendor-shop__title">${this.vendor.vendorName}</h2>
        </div>
        <button type="button" class="ui-panel__close" data-action="close" aria-label="Fechar loja">×</button>
      </header>
      <div class="ui-panel__body vendor-shop__body" data-hud-fit-root>
        <p class="vendor-shop__balance">
          Saldo: <strong data-vendor-wallet>${this.wallet.voltsFormatted}</strong>
        </p>
        <p class="vendor-shop__hint" data-hud-fit-secondary>
          Comerciantes locais compram apenas loot <strong>Comum</strong> e <strong>Incomum</strong> (50% do valor base).
          Itens Raros+ vão ao <strong>Terminal de Trocas</strong>.
        </p>

        <div class="vendor-shop__layout">
          <div class="vendor-shop__lists">
            <section class="vendor-shop__list-wrap" role="region" aria-label="Comprar suprimentos">
              <h3 class="vendor-shop__section-title">Comprar</h3>
              <div class="vendor-shop__list-head" aria-hidden="true">
                <span class="vendor-shop__col vendor-shop__col--item">Item</span>
                <span class="vendor-shop__col vendor-shop__col--buy">Preço Venda</span>
                <span class="vendor-shop__col vendor-shop__col--sell">Preço Revenda</span>
              </div>
              <ul class="vendor-shop__list">
                ${listings.length > 0
                  ? listings.map((listing) => this.renderListingRow(listing)).join('')
                  : '<li class="ui-empty">Este vendedor não tem itens no momento.</li>'}
              </ul>
            </section>

            <section class="vendor-shop__list-wrap vendor-shop__list-wrap--inventory" role="region" aria-label="Revender loot do inventário">
              <h3 class="vendor-shop__section-title">Revender do inventário</h3>
              <div class="vendor-shop__list-head vendor-shop__list-head--inventory" aria-hidden="true">
                <span class="vendor-shop__col vendor-shop__col--item">Item</span>
                <span class="vendor-shop__col vendor-shop__col--base">Valor Base</span>
                <span class="vendor-shop__col vendor-shop__col--sell">Preço Revenda</span>
              </div>
              <ul class="vendor-shop__list">
                ${inventoryRows.length > 0
                  ? inventoryRows.map((row) => this.renderInventorySellRow(row)).join('')
                  : blockedRows.length > 0
                    ? ''
                    : '<li class="ui-empty">Nenhum loot revendável no inventário.</li>'}
                ${blockedRows.map((row) => this.renderInventoryBlockedRow(row)).join('')}
                ${inventoryRows.length === 0 && blockedRows.length > 0
                  ? '<li class="ui-empty vendor-shop__empty-blocked">Itens de alto valor abaixo — use o Marketplace.</li>'
                  : ''}
              </ul>
            </section>
          </div>

          <aside class="vendor-shop__trade-hub" aria-label="Negociação">
            ${selectedListing
              ? this.renderCatalogTradeHub(selectedListing)
              : selectedInventoryRow
                ? this.renderInventoryTradeHub(selectedInventoryRow)
                : this.renderTradeHubIdle()}
          </aside>
        </div>
      </div>
    `;
  }

  private renderTradeHubIdle(): string {
    return `
      <div class="vendor-shop__trade-hub-inner vendor-shop__trade-hub-inner--idle">
        <span class="vendor-shop__trade-tag">NODE::IDLE</span>
        <p class="vendor-shop__trade-idle">Selecione um item para comprar ou revender loot do inventário.</p>
      </div>
    `;
  }

  private renderCatalogTradeHub(listing: NpcVendorListing): string {
    const label = resolveInventoryItemLabel(listing.itemId);
    const abbrev = resolveInventoryItemAbbrev(listing.itemId);
    const kindClass = resolveInventoryItemKindClass(listing.itemId);
    const owned = this.countInventoryItem(listing.itemId);
    const buyQuote = resolveNpcPurchaseQuote(listing, this.tradeQuantity);
    const sellQuote = resolveNpcSellQuote(listing, this.tradeQuantity);
    const buyUnit = resolveEffectiveNpcBuyUnitPrice(listing.itemId, listing) ?? 0;
    const sellUnit = resolveEffectiveNpcSellUnitPrice(listing.itemId, listing) ?? 0;
    const buyTotal = buyQuote?.totalVolts ?? buyUnit * this.tradeQuantity;
    const sellTotal = sellQuote?.totalVolts ?? sellUnit * this.tradeQuantity;
    const spread = resolveNpcPriceSpread(listing);
    const valorBase = resolveItemValorBase(listing.itemId);
    const rarityBlock = resolveNpcVendorRarityBlockReason(listing.itemId);
    const canSell = owned > 0 && !rarityBlock;

    return `
      <div class="vendor-shop__trade-hub-inner vendor-shop__trade-hub-inner--active ${kindClass}">
        <span class="vendor-shop__trade-tag">NODE::COMPRA</span>
        <div class="vendor-shop__trade-item">
          <span class="vendor-shop__trade-icon">${abbrev}</span>
          <div class="vendor-shop__trade-meta">
            <p class="vendor-shop__trade-name">${label}</p>
            <p class="vendor-shop__market-value">
              Valor Base: <span>${valorBase !== null ? formatVoltsShort(valorBase) : '—'}</span>
            </p>
            <p class="vendor-shop__market-value">
              Valor de Mercado: <span>${this.formatMarketValue(listing.marketValueVolts)}</span>
            </p>
            <p class="vendor-shop__trade-spread">Spread NPC: ${formatVoltsShort(spread)}</p>
          </div>
        </div>

        <label class="vendor-shop__trade-qty">
          <span class="vendor-shop__trade-qty-label">Quantidade</span>
          <input
            type="number"
            min="1"
            step="1"
            class="vendor-shop__trade-input"
            data-vendor-qty
            value="${this.tradeQuantity}"
            ${this.purchaseGateway.busyAttrs()}
          />
        </label>
        <p class="vendor-shop__trade-owned">No inventário: ×${owned}</p>

        <div class="vendor-shop__trade-actions">
          <button
            type="button"
            class="vendor-shop__trade-btn vendor-shop__trade-btn--buy"
            data-action="confirm-purchase"
            ${this.purchaseGateway.busyAttrs()}
          >
            Comprar por <strong data-vendor-buy-total>${formatVoltsShort(buyTotal)}</strong>
          </button>
          ${rarityBlock && owned > 0
            ? `<p class="vendor-shop__rarity-hint" title="${rarityBlock}">${rarityBlock}</p>`
            : canSell
              ? `<button
                  type="button"
                  class="vendor-shop__trade-btn vendor-shop__trade-btn--sell"
                  data-action="confirm-sell"
                  ${this.sellGateway.busyAttrs()}
                >
                  Vender por <strong data-vendor-sell-total>${formatVoltsShort(sellTotal)}</strong>
                </button>`
              : ''}
        </div>

        <button type="button" class="vendor-shop__trade-cancel" data-action="cancel-trade">
          Cancelar seleção
        </button>
      </div>
    `;
  }

  private renderInventoryTradeHub(row: InventorySellRow): string {
    const abbrev = resolveInventoryItemAbbrev(row.itemId);
    const kindClass = resolveInventoryItemKindClass(row.itemId);
    const sellQuote = resolveInventoryItemSellQuote(row.itemId, this.tradeQuantity);
    const sellTotal = sellQuote?.totalVolts ?? row.sellUnitPrice * this.tradeQuantity;

    return `
      <div class="vendor-shop__trade-hub-inner vendor-shop__trade-hub-inner--active ${kindClass}">
        <span class="vendor-shop__trade-tag">NODE::REVENDA</span>
        <div class="vendor-shop__trade-item">
          <span class="vendor-shop__trade-icon">${abbrev}</span>
          <div class="vendor-shop__trade-meta">
            <p class="vendor-shop__trade-name">${row.label}</p>
            <p class="vendor-shop__market-value">
              Valor Base: <span>${formatVoltsShort(row.valorBase)}</span>
            </p>
            <p class="vendor-shop__trade-spread">Revenda NPC = 50% do valor base</p>
          </div>
        </div>

        <label class="vendor-shop__trade-qty">
          <span class="vendor-shop__trade-qty-label">Quantidade</span>
          <input
            type="number"
            min="1"
            max="${row.quantity}"
            step="1"
            class="vendor-shop__trade-input"
            data-vendor-qty
            value="${this.tradeQuantity}"
          />
        </label>
        <p class="vendor-shop__trade-owned">No inventário: ×${row.quantity}</p>

        <div class="vendor-shop__trade-actions">
          <button
            type="button"
            class="vendor-shop__trade-btn vendor-shop__trade-btn--sell"
            data-action="confirm-sell"
            ${this.sellGateway.busyAttrs()}
          >
            Vender por <strong data-vendor-sell-total>${formatVoltsShort(sellTotal)}</strong>
          </button>
        </div>

        <button type="button" class="vendor-shop__trade-cancel" data-action="cancel-trade">
          Cancelar seleção
        </button>
      </div>
    `;
  }

  private renderListingRow(listing: NpcVendorListing): string {
    const selected = this.tradeMode === 'catalog' && this.selectedItemId === listing.itemId;
    const kindClass = resolveInventoryItemKindClass(listing.itemId);
    const label = resolveInventoryItemLabel(listing.itemId);
    const abbrev = resolveInventoryItemAbbrev(listing.itemId);
    const buyUnit = resolveEffectiveNpcBuyUnitPrice(listing.itemId, listing) ?? 0;
    const sellUnit = resolveEffectiveNpcSellUnitPrice(listing.itemId, listing) ?? 0;

    return `
      <li>
        <button
          type="button"
          class="vendor-shop__row ${kindClass}${selected ? ' is-selected' : ''}"
          data-select-vendor-item="${listing.itemId}"
          data-hud-fit-item
          data-hud-priority="3"
          aria-pressed="${selected ? 'true' : 'false'}"
        >
          <span class="vendor-shop__col vendor-shop__col--item">
            <span class="vendor-shop__icon" aria-hidden="true">${abbrev}</span>
            <span class="vendor-shop__item-text">
              <span class="vendor-shop__name">${label}</span>
              <span class="vendor-shop__market-value vendor-shop__market-value--inline">
                Valor de Mercado: ${this.formatMarketValue(listing.marketValueVolts)}
              </span>
            </span>
          </span>
          <span class="vendor-shop__col vendor-shop__col--buy">
            <span class="vendor-shop__price vendor-shop__price--buy">${formatVoltsShort(buyUnit)}</span>
          </span>
          <span class="vendor-shop__col vendor-shop__col--sell">
            <span class="vendor-shop__price vendor-shop__price--sell">${formatVoltsShort(sellUnit)}</span>
          </span>
        </button>
      </li>
    `;
  }

  private renderInventoryBlockedRow(row: InventoryNpcBlockedRow): string {
    const kindClass = resolveInventoryItemKindClass(row.itemId);
    const abbrev = resolveInventoryItemAbbrev(row.itemId);

    return `
      <li>
        <div
          class="vendor-shop__row vendor-shop__row--inventory vendor-shop__row--blocked ${kindClass}"
          data-hud-fit-item
          data-hud-priority="5"
          title="${row.hint}"
          aria-label="${row.label}: ${row.hint}"
        >
          <span class="vendor-shop__col vendor-shop__col--item">
            <span class="vendor-shop__icon" aria-hidden="true">${abbrev}</span>
            <span class="vendor-shop__item-text">
              <span class="vendor-shop__name">${row.label}</span>
              <span class="vendor-shop__market-value vendor-shop__market-value--inline vendor-shop__rarity-hint">${row.hint}</span>
            </span>
          </span>
          <span class="vendor-shop__col vendor-shop__col--base">
            <span class="vendor-shop__price vendor-shop__price--base">${formatVoltsShort(row.valorBase)}</span>
          </span>
          <span class="vendor-shop__col vendor-shop__col--sell">
            <span class="vendor-shop__blocked-badge">Marketplace</span>
          </span>
        </div>
      </li>
    `;
  }

  private renderInventorySellRow(row: InventorySellRow): string {
    const selected = this.tradeMode === 'inventory' && this.selectedItemId === row.itemId;
    const kindClass = resolveInventoryItemKindClass(row.itemId);
    const abbrev = resolveInventoryItemAbbrev(row.itemId);

    return `
      <li>
        <button
          type="button"
          class="vendor-shop__row vendor-shop__row--inventory ${kindClass}${selected ? ' is-selected' : ''}"
          data-hud-fit-item
          data-hud-priority="4"
          data-select-inventory-item="${row.itemId}"
          aria-pressed="${selected ? 'true' : 'false'}"
        >
          <span class="vendor-shop__col vendor-shop__col--item">
            <span class="vendor-shop__icon" aria-hidden="true">${abbrev}</span>
            <span class="vendor-shop__item-text">
              <span class="vendor-shop__name">${row.label}</span>
              <span class="vendor-shop__market-value vendor-shop__market-value--inline">×${row.quantity} no inventário</span>
            </span>
          </span>
          <span class="vendor-shop__col vendor-shop__col--base">
            <span class="vendor-shop__price vendor-shop__price--base">${formatVoltsShort(row.valorBase)}</span>
          </span>
          <span class="vendor-shop__col vendor-shop__col--sell">
            <span class="vendor-shop__price vendor-shop__price--sell">${formatVoltsShort(row.sellUnitPrice)}</span>
          </span>
        </button>
      </li>
    `;
  }

  private formatMarketValue(value: number | null): string {
    if (value === null) return '—';
    return formatVoltsShort(value);
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
    const el = this.query<HTMLElement>('[data-vendor-wallet]');
    if (el) el.textContent = this.wallet.voltsFormatted;
  }

  private updateTradeTotals(): void {
    if (!this.selectedItemId) return;

    const sellEl = this.query<HTMLElement>('[data-vendor-sell-total]');
    if (!sellEl) return;

    if (this.tradeMode === 'catalog') {
      const listing = findNpcVendorListing(this.vendor.vendorId, this.selectedItemId);
      if (!listing) return;

      const buyQuote = resolveNpcPurchaseQuote(listing, this.tradeQuantity);
      const sellQuote = resolveNpcSellQuote(listing, this.tradeQuantity);
      const buyEl = this.query<HTMLElement>('[data-vendor-buy-total]');
      if (buyEl && buyQuote) buyEl.textContent = formatVoltsShort(buyQuote.totalVolts);
      if (sellQuote) sellEl.textContent = formatVoltsShort(sellQuote.totalVolts);
      return;
    }

    const sellQuote = resolveInventoryItemSellQuote(this.selectedItemId, this.tradeQuantity);
    if (sellQuote) sellEl.textContent = formatVoltsShort(sellQuote.totalVolts);
  }

  private clampTradeQuantity(): void {
    this.tradeQuantity = Math.max(1, Math.floor(this.tradeQuantity));
    if (this.tradeMode === 'inventory' && this.selectedItemId) {
      const owned = this.countInventoryItem(this.selectedItemId);
      if (owned > 0) this.tradeQuantity = Math.min(this.tradeQuantity, owned);
    }
  }

  protected override bindEvents(): void {
    this.root?.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;

      if (target.dataset.action === 'close') {
        this.close();
        return;
      }

      if (target.dataset.action === 'cancel-trade') {
        this.selectedItemId = null;
        this.tradeMode = 'catalog';
        this.tradeQuantity = 1;
        this.render();
        return;
      }

      const catalogRow = target.closest<HTMLElement>('[data-select-vendor-item]');
      if (catalogRow) {
        this.selectedItemId = catalogRow.dataset.selectVendorItem ?? null;
        this.tradeMode = 'catalog';
        this.tradeQuantity = 1;
        this.render();
        return;
      }

      const inventoryRow = target.closest<HTMLElement>('[data-select-inventory-item]');
      if (inventoryRow) {
        this.selectedItemId = inventoryRow.dataset.selectInventoryItem ?? null;
        this.tradeMode = 'inventory';
        this.tradeQuantity = 1;
        this.render();
        return;
      }

    });

    this.root?.addEventListener('input', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement) || !target.matches('[data-vendor-qty]')) return;
      if (!this.selectedItemId) return;

      this.tradeQuantity = Math.max(1, Math.floor(Number(target.value) || 1));
      this.clampTradeQuantity();
      if (String(this.tradeQuantity) !== target.value) {
        target.value = String(this.tradeQuantity);
      }
      this.updateTradeTotals();
    });
  }

  private buildPurchaseGatewayOptions(): ActionGatewayButtonOptions {
    return {
      getLabelHtml: () => {
        if (!this.selectedItemId || this.tradeMode !== 'catalog') return 'Comprar';
        const listing = findNpcVendorListing(this.vendor.vendorId, this.selectedItemId);
        if (!listing) return 'Comprar';
        const buyQuote = resolveNpcPurchaseQuote(listing, this.tradeQuantity);
        const buyUnit = resolveEffectiveNpcBuyUnitPrice(listing.itemId, listing) ?? 0;
        const buyTotal = buyQuote?.totalVolts ?? buyUnit * this.tradeQuantity;
        return `Comprar por <strong data-vendor-buy-total>${formatVoltsShort(buyTotal)}</strong>`;
      },
      relatedElements: () => {
        const qty = this.query<HTMLInputElement>('[data-vendor-qty]');
        return qty ? [qty] : [];
      },
      onClick: () => {
        if (!this.selectedItemId || this.tradeMode !== 'catalog') return;
        const result = this.dispatcher.dispatch({
          type: 'PURCHASE_NPC_ITEM',
          payload: {
            vendorId: this.vendor.vendorId,
            itemId: this.selectedItemId,
            quantity: this.tradeQuantity,
          },
        });
        if (!result.ok) {
          alertSystem(result.reason);
          return;
        }
        if (result.status === 'applied') {
          this.tradeQuantity = 1;
          this.render();
        }
        return result;
      },
      onResolved: () => {
        this.tradeQuantity = 1;
        this.render();
      },
    };
  }

  private buildSellGatewayOptions(): ActionGatewayButtonOptions {
    return {
      getLabelHtml: () => {
        if (!this.selectedItemId) return 'Vender';
        if (this.tradeMode === 'catalog') {
          const listing = findNpcVendorListing(this.vendor.vendorId, this.selectedItemId);
          if (!listing) return 'Vender';
          const sellQuote = resolveNpcSellQuote(listing, this.tradeQuantity);
          const sellUnit = resolveEffectiveNpcSellUnitPrice(listing.itemId, listing) ?? 0;
          const sellTotal = sellQuote?.totalVolts ?? sellUnit * this.tradeQuantity;
          return `Vender por <strong data-vendor-sell-total>${formatVoltsShort(sellTotal)}</strong>`;
        }
        const sellQuote = resolveInventoryItemSellQuote(this.selectedItemId, this.tradeQuantity);
        const row = listInventorySellRows(this.inventory).find((r) => r.itemId === this.selectedItemId);
        const sellTotal = sellQuote?.totalVolts ?? (row?.sellUnitPrice ?? 0) * this.tradeQuantity;
        return `Vender por <strong data-vendor-sell-total>${formatVoltsShort(sellTotal)}</strong>`;
      },
      relatedElements: () => {
        const qty = this.query<HTMLInputElement>('[data-vendor-qty]');
        return qty ? [qty] : [];
      },
      onClick: () => {
        if (!this.selectedItemId) return;
        const result = this.dispatcher.dispatch({
          type: 'SELL_NPC_ITEM',
          payload: {
            vendorId: this.vendor.vendorId,
            itemId: this.selectedItemId,
            quantity: this.tradeQuantity,
          },
        });
        if (!result.ok) {
          alertSystem(result.reason);
          return;
        }
        if (result.status === 'applied') {
          this.tradeQuantity = 1;
          this.selectedItemId = null;
          this.tradeMode = 'catalog';
          this.render();
        }
        return result;
      },
      onResolved: () => {
        this.tradeQuantity = 1;
        this.selectedItemId = null;
        this.tradeMode = 'catalog';
        this.render();
      },
    };
  }
}
