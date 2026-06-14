import { BaseUIComponent } from '../UIComponent.js';
import { revokeMarketTerminalAccess } from '../../../shared/economy/marketAccessGate.js';
import { formatMarketplaceFeePercent } from '../../../shared/economy/marketplaceEconomy.js';
import { ITEM_CATALOG } from '../../../shared/items/itemCatalog.js';
import { ItemRegistry } from '../../../shared/items/ItemRegistry.js';
import {
  buildMarketOfferTableView,
  formatMarketVolts,
  getMarketBrowseCategoryLabels,
  listMarketBrowseItems,
  resolveMarketAverageLabel,
  resolveMarketOfferDisplayName,
  type MarketBrowseCategoryId,
  type MarketOfferRow,
  type MarketOfferSide,
} from '../../../shared/economy/marketplaceOrderBook.js';
import { getActionDispatcher } from '../../ActionDispatcher.js';
import { endWorldHudInteractionSession } from '../../world/worldHudInteractionSession.js';
import { getDataStore } from '../../economy/economyLayer.js';
import type { InventorySnapshot } from '../../../shared/character/inventorySlots.js';
import type { WalletSnapshot } from '../../../shared/playerDataSnapshots.js';
import { alertSystem } from '../alertSystem.js';
import { uiEvents, UIEventType } from '../uiEvents.js';
import {
  buildDefaultMarketOfferFormState,
  clampMarketOfferQuantity,
  type MarketOfferFormState,
} from '../market/marketOfferFormHelpers.js';
import {
  getMarketplaceOrderBookSnapshot,
  resolveOwnMarketOfferRef,
  subscribeMarketplaceOrderBook,
} from '../market/marketplaceOrderBookClient.js';
import { resolveItemLabel } from '../market/marketSellFormHelpers.js';
import { listMarketSellInventoryRows } from '../market/marketSellForm.js';
import {
  bindDelegatedItemIconFallback,
  renderItemIconHtml,
} from '../items/itemIconDisplay.js';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Terminal do Mercado — livro de ofertas horizontal sem scroll. */
export class MarketPanel extends BaseUIComponent {
  private readonly dataStore = getDataStore();
  private readonly dispatcher = getActionDispatcher();

  private inventory: InventorySnapshot = this.dataStore.getInventory();
  private wallet: WalletSnapshot = this.dataStore.getWallet();
  private browseCategory: MarketBrowseCategoryId = 'all';
  private searchQuery = '';
  private offerForm: MarketOfferFormState = buildDefaultMarketOfferFormState(this.inventory);

  private unsubInventory: (() => void) | null = null;
  private unsubWallet: (() => void) | null = null;
  private unsubOrderBook: (() => void) | null = null;

  constructor() {
    super({
      id: 'market',
      rootClassName: 'ui-panel ui-panel--market ui-panel--market-terminal ui-panel--movable',
    });
  }

  protected override shouldUseDynamicLayout(): boolean {
    return false;
  }

  protected override onOpen(): void {
    ItemRegistry.syncFromCatalog(ITEM_CATALOG);
    this.refreshSnapshots();
    this.offerForm = buildDefaultMarketOfferFormState(
      this.inventory,
      this.offerForm.selectedItemId,
    );
    this.ensureSelectedBrowseItem();

    this.unsubInventory = this.dataStore.subscribe('inventory', (snapshot) => {
      this.inventory = snapshot;
      this.offerForm = {
        ...this.offerForm,
        quantity: clampMarketOfferQuantity(
          this.offerForm.offerSide,
          this.offerForm.selectedItemId,
          this.offerForm.quantity,
          snapshot,
        ),
      };
      if (this.isOpen()) this.render();
    });

    this.unsubWallet = this.dataStore.subscribe('wallet', (wallet) => {
      this.wallet = wallet;
      if (this.isOpen()) this.patchWalletLabel();
    });

    this.unsubOrderBook = subscribeMarketplaceOrderBook(() => {
      if (this.isOpen()) this.renderOfferTables();
    });
  }

  protected override onClose(): void {
    this.unsubInventory?.();
    this.unsubWallet?.();
    this.unsubOrderBook?.();
    this.unsubInventory = null;
    this.unsubWallet = null;
    this.unsubOrderBook = null;

    revokeMarketTerminalAccess();
    const snapshot = endWorldHudInteractionSession();
    if (snapshot) {
      uiEvents.emit(UIEventType.RESTORE_WORLD_PLAYER_POSITION, snapshot);
    }
  }

  private refreshSnapshots(): void {
    this.inventory = this.dataStore.getInventory();
    this.wallet = this.dataStore.getWallet();
  }

  private ensureSelectedBrowseItem(): void {
    const items = listMarketBrowseItems(this.browseCategory, this.searchQuery);
    if (items.length === 0) {
      this.offerForm = { ...this.offerForm, selectedItemId: null };
      return;
    }
    const stillVisible = this.offerForm.selectedItemId
      && items.some((item) => item.itemId === this.offerForm.selectedItemId);
    if (!stillVisible) {
      this.offerForm = {
        ...this.offerForm,
        selectedItemId: items[0]!.itemId,
      };
    }
  }

  createTemplate(): string {
    this.ensureSelectedBrowseItem();
    const selectedId = this.offerForm.selectedItemId;
    const selectedLabel = selectedId ? resolveItemLabel(selectedId) : '—';

    return `
      <header class="ui-panel__header market-terminal__header" data-panel-drag-handle>
        <div class="market-terminal__header-main">
          <span class="market-terminal__tag">MERCADO // TERMINAL P2P</span>
          <h2 class="ui-panel__title market-terminal__title">Monitor do Mercado</h2>
        </div>
        <button type="button" class="ui-panel__close" data-action="close" aria-label="Fechar Monitor do Mercado">×</button>
      </header>

      <div class="ui-panel__body market-terminal__body">
        <p class="market-terminal__balance">
          Saldo: <strong data-market-wallet>${escapeHtml(this.wallet.voltsFormatted)}</strong>
          <span class="market-terminal__fee">Taxa P2P: ${formatMarketplaceFeePercent()}</span>
        </p>

        <div class="market-terminal__workspace">
          <aside class="market-terminal__sidebar" aria-label="Categorias e itens">
            ${this.renderSidebar()}
          </aside>

          <div class="market-terminal__center">
            <p class="market-terminal__item-focus">
              Item: <strong>${escapeHtml(selectedLabel)}</strong>
              ${selectedId ? `<span class="market-terminal__average">${escapeHtml(resolveMarketAverageLabel(selectedId))}</span>` : ''}
            </p>
            ${selectedId ? this.renderOfferBoards(selectedId) : this.renderNoItemSelected()}
          </div>
        </div>

        ${this.renderCreateOfferFooter()}
      </div>
    `;
  }

  private renderSidebar(): string {
    const categories = getMarketBrowseCategoryLabels()
      .map((entry) => {
        const active = this.browseCategory === entry.id;
        return `
          <button
            type="button"
            class="market-terminal__category${active ? ' is-active' : ''}"
            data-market-category="${entry.id}"
            aria-pressed="${active ? 'true' : 'false'}"
          >${escapeHtml(entry.label)}</button>
        `;
      })
      .join('');

    const items = listMarketBrowseItems(this.browseCategory, this.searchQuery);
    const itemRows = items.length > 0
      ? items.map((item) => {
          const active = this.offerForm.selectedItemId === item.itemId;
          return `
            <button
              type="button"
              class="market-terminal__item${active ? ' is-active' : ''}"
              data-market-item="${item.itemId}"
              aria-pressed="${active ? 'true' : 'false'}"
            >
              ${renderItemIconHtml(item.itemId, { className: 'market-terminal__item-icon' })}
              <span class="market-terminal__item-label">${escapeHtml(item.label)}</span>
            </button>
          `;
        }).join('')
      : '<p class="market-terminal__sidebar-empty">Nenhum item nesta categoria.</p>';

    return `
      <label class="market-terminal__search">
        <span class="market-terminal__search-label">Buscar</span>
        <input
          type="search"
          class="market-terminal__search-input"
          data-market-search
          value="${escapeHtml(this.searchQuery)}"
          placeholder="Nome do item…"
          autocomplete="off"
        />
      </label>
      <nav class="market-terminal__categories" aria-label="Categorias">${categories}</nav>
      <div class="market-terminal__item-list" role="listbox" aria-label="Itens">${itemRows}</div>
    `;
  }

  private renderNoItemSelected(): string {
    return `
      <div class="market-terminal__offers-empty">
        Selecione um item na barra lateral para ver ofertas de venda e compra.
      </div>
    `;
  }

  private renderOfferBoards(itemId: string): string {
    const book = getMarketplaceOrderBookSnapshot();
    const sellView = buildMarketOfferTableView(book, 'sell', itemId);
    const buyView = buildMarketOfferTableView(book, 'buy', itemId);

    return `
      <div class="market-terminal__offers-grid">
        <section class="market-terminal__offers-block market-terminal__offers-block--sell" aria-label="Ofertas de venda">
          <h3 class="market-terminal__offers-title">Sell Offers</h3>
          ${this.renderOfferTable(sellView.paddedRows, 'sell')}
        </section>
        <section class="market-terminal__offers-block market-terminal__offers-block--buy" aria-label="Ofertas de compra">
          <h3 class="market-terminal__offers-title">Buy Offers</h3>
          ${this.renderOfferTable(buyView.paddedRows, 'buy')}
        </section>
      </div>
    `;
  }

  private renderOfferTable(rows: readonly (MarketOfferRow | null)[], side: MarketOfferSide): string {
    const body = rows.map((row, index) => {
      if (!row) {
        return `
          <tr class="market-terminal__offer-row market-terminal__offer-row--empty">
            <td colspan="5" aria-label="Linha vazia ${index + 1}">—</td>
          </tr>
        `;
      }

      const name = resolveMarketOfferDisplayName(row);
      const ownClass = row.isOwn ? ' market-terminal__offer-row--own' : '';
      const actionCell = row.isOwn
        ? `
          <td class="market-terminal__offer-cell market-terminal__offer-cell--action">
            <button
              type="button"
              class="market-terminal__offer-cancel"
              data-action="cancel-offer"
              data-offer-id="${escapeHtml(row.id)}"
              data-offer-side="${side}"
              aria-label="Cancelar oferta"
            >Cancelar</button>
          </td>
        `
        : '<td class="market-terminal__offer-cell market-terminal__offer-cell--action" aria-hidden="true"></td>';

      return `
        <tr class="market-terminal__offer-row${ownClass}" data-offer-side="${side}" data-offer-id="${escapeHtml(row.id)}">
          <td class="market-terminal__offer-cell market-terminal__offer-cell--name">${escapeHtml(name)}</td>
          <td class="market-terminal__offer-cell market-terminal__offer-cell--qty">×${row.quantity}</td>
          <td class="market-terminal__offer-cell market-terminal__offer-cell--unit">${formatMarketVolts(row.unitPriceVolts)}</td>
          <td class="market-terminal__offer-cell market-terminal__offer-cell--total">${formatMarketVolts(row.totalPriceVolts)}</td>
          ${actionCell}
        </tr>
      `;
    }).join('');

    return `
      <table class="market-terminal__offer-table">
        <thead>
          <tr>
            <th scope="col">Nome</th>
            <th scope="col">Quantidade</th>
            <th scope="col">Preço Unitário</th>
            <th scope="col">Preço Total</th>
            <th scope="col">Ação</th>
          </tr>
        </thead>
        <tbody>${body}</tbody>
      </table>
    `;
  }

  private renderCreateOfferFooter(): string {
    const form = this.offerForm;
    const itemId = form.selectedItemId;
    const sellRows = listMarketSellInventoryRows(this.inventory);
    const canSellItem = itemId ? sellRows.some((row) => row.itemId === itemId) : false;
    const maxSellQty = itemId
      ? sellRows.find((row) => row.itemId === itemId)?.quantity ?? 0
      : 0;
    const qty = itemId
      ? clampMarketOfferQuantity(form.offerSide, itemId, form.quantity, this.inventory)
      : 1;
    const total = qty * Math.max(1, form.unitPriceVolts);
    const sellActive = form.offerSide === 'sell';
    const buyActive = form.offerSide === 'buy';

    const submitDisabled = !itemId
      || (sellActive && !canSellItem)
      || (buyActive && this.wallet.dollarVolt < total);

    return `
      <footer class="market-terminal__footer" aria-label="Criar oferta">
        <div class="market-terminal__footer-side">
          <span class="market-terminal__footer-label">Tipo</span>
          <div class="market-terminal__side-toggle" role="group" aria-label="Vender ou comprar">
            <button
              type="button"
              class="market-terminal__side-btn${sellActive ? ' is-active' : ''}"
              data-market-side="sell"
              aria-pressed="${sellActive ? 'true' : 'false'}"
            >Vender</button>
            <button
              type="button"
              class="market-terminal__side-btn${buyActive ? ' is-active' : ''}"
              data-market-side="buy"
              aria-pressed="${buyActive ? 'true' : 'false'}"
            >Comprar</button>
          </div>
        </div>

        <label class="market-terminal__footer-field">
          <span class="market-terminal__footer-label">Quantidade</span>
          <input
            type="number"
            class="market-terminal__footer-input"
            data-market-offer-qty
            min="1"
            max="${sellActive && maxSellQty > 0 ? maxSellQty : 9999}"
            step="1"
            value="${qty}"
          />
        </label>

        <label class="market-terminal__footer-field">
          <span class="market-terminal__footer-label">Preço por peça</span>
          <input
            type="number"
            class="market-terminal__footer-input"
            data-market-offer-price
            min="1"
            step="1"
            value="${Math.max(1, form.unitPriceVolts)}"
          />
        </label>

        <label class="market-terminal__footer-anon">
          <input
            type="checkbox"
            data-market-offer-anon
            ${form.anonymous ? 'checked' : ''}
          />
          <span>Anonimato</span>
        </label>

        <div class="market-terminal__footer-submit-wrap">
          <p class="market-terminal__footer-total" data-market-offer-total>
            Total: <strong>${formatMarketVolts(total)}</strong>
          </p>
          <button
            type="button"
            class="market-terminal__footer-submit"
            data-action="publish-offer"
            ${submitDisabled ? 'disabled' : ''}
          >
            Publicar oferta
          </button>
        </div>
      </footer>
    `;
  }

  protected override bindEvents(): void {
    bindDelegatedItemIconFallback(this.root);

    this.root?.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;

      if (target.dataset.action === 'close') {
        this.close();
        return;
      }

      if (target.dataset.action === 'publish-offer') {
        this.publishOffer();
        return;
      }

      const cancelBtn = target.closest<HTMLElement>('[data-action="cancel-offer"]');
      if (cancelBtn) {
        const offerId = cancelBtn.dataset.offerId;
        const offerSide = cancelBtn.dataset.offerSide;
        if (offerId && (offerSide === 'sell' || offerSide === 'buy')) {
          this.cancelOffer(offerId, offerSide);
        }
        return;
      }

      const category = target.closest<HTMLElement>('[data-market-category]')?.dataset.marketCategory;
      if (category) {
        this.browseCategory = category as MarketBrowseCategoryId;
        this.ensureSelectedBrowseItem();
        this.renderPreservingSidebarScroll();
        return;
      }

      const itemId = target.closest<HTMLElement>('[data-market-item]')?.dataset.marketItem;
      if (itemId) {
        event.preventDefault();
        this.selectBrowseItem(itemId);
        return;
      }

      const side = target.closest<HTMLElement>('[data-market-side]')?.dataset.marketSide;
      if (side === 'sell' || side === 'buy') {
        this.offerForm = { ...this.offerForm, offerSide: side };
        this.patchOfferSideToggle();
        this.patchFooterTotals();
        return;
      }
    });

    this.root?.addEventListener('input', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement)) return;

      if (target.matches('[data-market-search]')) {
        this.searchQuery = target.value;
        this.ensureSelectedBrowseItem();
        this.renderPreservingSidebarScroll();
        return;
      }

      if (target.matches('[data-market-offer-qty]')) {
        this.offerForm = {
          ...this.offerForm,
          quantity: clampMarketOfferQuantity(
            this.offerForm.offerSide,
            this.offerForm.selectedItemId,
            Number(target.value) || 1,
            this.inventory,
          ),
        };
        this.patchFooterTotals();
        return;
      }

      if (target.matches('[data-market-offer-price]')) {
        this.offerForm = {
          ...this.offerForm,
          unitPriceVolts: Math.max(1, Math.floor(Number(target.value) || 1)),
        };
        this.patchFooterTotals();
        return;
      }

      if (target.matches('[data-market-offer-anon]')) {
        this.offerForm = { ...this.offerForm, anonymous: target.checked };
      }
    });
  }

  private renderPreservingSidebarScroll(): void {
    const list = this.query<HTMLElement>('.market-terminal__item-list');
    const scrollTop = list?.scrollTop ?? 0;
    this.render();
    const nextList = this.query<HTMLElement>('.market-terminal__item-list');
    if (nextList) nextList.scrollTop = scrollTop;
  }

  private selectBrowseItem(itemId: string): void {
    if (this.offerForm.selectedItemId === itemId) return;
    this.offerForm = { ...this.offerForm, selectedItemId: itemId };
    this.patchItemSelection(itemId);
    this.patchCenterForItem(itemId);
    this.patchFooterTotals();
  }

  private patchItemSelection(itemId: string): void {
    const list = this.query<HTMLElement>('.market-terminal__item-list');
    if (!list) {
      this.render();
      return;
    }

    const scrollTop = list.scrollTop;
    for (const button of list.querySelectorAll<HTMLElement>('[data-market-item]')) {
      const active = button.dataset.marketItem === itemId;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    }
    list.scrollTop = scrollTop;
  }

  private patchCenterForItem(itemId: string): void {
    const center = this.query<HTMLElement>('.market-terminal__center');
    if (!center) {
      this.render();
      return;
    }

    const label = resolveItemLabel(itemId);
    const focus = center.querySelector('.market-terminal__item-focus');
    if (focus) {
      focus.innerHTML = `
        Item: <strong>${escapeHtml(label)}</strong>
        <span class="market-terminal__average">${escapeHtml(resolveMarketAverageLabel(itemId))}</span>
      `;
    }

    this.renderOfferTables();
  }

  private patchOfferSideToggle(): void {
    const sellActive = this.offerForm.offerSide === 'sell';
    for (const button of this.root?.querySelectorAll<HTMLElement>('[data-market-side]') ?? []) {
      const active = button.dataset.marketSide === this.offerForm.offerSide;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    }

    const qtyInput = this.query<HTMLInputElement>('[data-market-offer-qty]');
    if (qtyInput && sellActive) {
      const itemId = this.offerForm.selectedItemId;
      const maxSellQty = itemId
        ? listMarketSellInventoryRows(this.inventory).find((row) => row.itemId === itemId)?.quantity ?? 0
        : 0;
      qtyInput.max = maxSellQty > 0 ? String(maxSellQty) : '9999';
    } else if (qtyInput) {
      qtyInput.max = '9999';
    }
  }

  private cancelOffer(offerId: string, side: MarketOfferSide): void {
    const ref = resolveOwnMarketOfferRef(offerId);
    if (!ref || ref.side !== side) {
      alertSystem('Somente suas ofertas podem ser canceladas.');
      return;
    }

    const result = ref.side === 'sell'
      ? this.dispatcher.dispatch({
        type: 'CANCEL_MARKET_LISTING',
        payload: { listingId: ref.listingId },
      })
      : this.dispatcher.dispatch({
        type: 'CANCEL_MARKET_BUY_ORDER',
        payload: { orderId: ref.orderId },
      });

    if (!result.ok) {
      alertSystem(result.reason);
      return;
    }
    if (result.status === 'applied') {
      this.render();
    }
  }

  private publishOffer(): void {
    const form = this.offerForm;
    if (!form.selectedItemId) return;

    const qty = clampMarketOfferQuantity(
      form.offerSide,
      form.selectedItemId,
      form.quantity,
      this.inventory,
    );
    const unit = Math.max(1, form.unitPriceVolts);

    if (form.offerSide === 'sell') {
      const result = this.dispatcher.dispatch({
        type: 'CREATE_MARKET_LISTING',
        payload: {
          itemId: form.selectedItemId,
          quantity: qty,
          unitPriceVolts: unit,
          anonymous: form.anonymous,
        },
      });
      if (!result.ok) {
        alertSystem(result.reason);
        return;
      }
      if (result.status === 'applied') {
        this.offerForm = { ...form, quantity: 1 };
        this.render();
      }
      return;
    }

    const result = this.dispatcher.dispatch({
      type: 'CREATE_MARKET_BUY_ORDER',
      payload: {
        itemId: form.selectedItemId,
        quantity: qty,
        unitPriceVolts: unit,
        anonymous: form.anonymous,
      },
    });
    if (!result.ok) {
      alertSystem(result.reason);
      return;
    }
    if (result.status === 'applied') {
      this.render();
    }
  }

  private patchWalletLabel(): void {
    const el = this.query<HTMLElement>('[data-market-wallet]');
    if (el) el.textContent = this.wallet.voltsFormatted;
    this.patchFooterTotals();
  }

  private patchFooterTotals(): void {
    const itemId = this.offerForm.selectedItemId;
    const qty = itemId
      ? clampMarketOfferQuantity(
        this.offerForm.offerSide,
        itemId,
        this.offerForm.quantity,
        this.inventory,
      )
      : 1;
    const total = qty * Math.max(1, this.offerForm.unitPriceVolts);
    const totalEl = this.query<HTMLElement>('[data-market-offer-total] strong');
    if (totalEl) totalEl.textContent = formatMarketVolts(total);

    const submit = this.query<HTMLButtonElement>('[data-action="publish-offer"]');
    if (!submit || !itemId) return;
    const sellRows = listMarketSellInventoryRows(this.inventory);
    const canSell = this.offerForm.offerSide === 'sell'
      && sellRows.some((row) => row.itemId === itemId);
    const canBuy = this.offerForm.offerSide === 'buy' && this.wallet.dollarVolt >= total;
    submit.disabled = this.offerForm.offerSide === 'sell' ? !canSell : !canBuy;
  }

  private renderOfferTables(): void {
    const itemId = this.offerForm.selectedItemId;
    if (!itemId) return;
    const center = this.query<HTMLElement>('.market-terminal__center');
    if (!center) return;
    const focus = center.querySelector('.market-terminal__item-focus');
    const boardsHtml = this.renderOfferBoards(itemId);
    const existingBlocks = center.querySelector('.market-terminal__offers-block--sell');
    if (existingBlocks) {
      const wrapper = document.createElement('div');
      wrapper.className = 'market-terminal__offers-grid';
      wrapper.innerHTML = boardsHtml;
      const oldGrid = center.querySelector('.market-terminal__offers-grid');
      oldGrid?.remove();
      const oldEmpty = center.querySelector('.market-terminal__offers-empty');
      oldEmpty?.remove();
      focus?.insertAdjacentElement('afterend', wrapper);
      return;
    }
    this.render();
  }
}
