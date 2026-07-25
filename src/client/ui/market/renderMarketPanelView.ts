// @ts-nocheck
import { formatMarketplaceFeePercent } from '../../../shared/economy/marketplaceEconomy.js';
import { buildMarketOfferTableView, formatMarketVolts, getMarketBrowseCategoryLabels, listMarketBrowseItems, resolveMarketAverageLabel, resolveMarketOfferDisplayName, } from '../../../shared/economy/marketplaceOrderBook.js';
import { renderItemIconHtml } from '../items/itemIconDisplay.js';
import { clampMarketOfferQuantity, } from '../market/marketOfferFormHelpers.js';
import { getMarketplaceOrderBookSnapshot } from '../market/marketplaceOrderBookClient.js';
import { resolveItemLabel } from '../market/marketSellFormHelpers.js';
import { listMarketSellInventoryRows } from '../market/marketSellForm.js';
function escapeHtml(value) {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
function renderSidebar(model) {
    const categories = getMarketBrowseCategoryLabels()
        .map((entry) => {
        const active = model.browseCategory === entry.id;
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
    const items = listMarketBrowseItems(model.browseCategory, model.searchQuery);
    const itemRows = items.length > 0
        ? items.map((item) => {
            const active = model.offerForm.selectedItemId === item.itemId;
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
        value="${escapeHtml(model.searchQuery)}"
        placeholder="Nome do item…"
        autocomplete="off"
      />
    </label>
    <nav class="market-terminal__categories" aria-label="Categorias">${categories}</nav>
    <div class="market-terminal__item-list" role="listbox" aria-label="Itens">${itemRows}</div>
  `;
}
function renderNoItemSelected() {
    return `
    <div class="market-terminal__offers-empty">
      Selecione um item na barra lateral para ver ofertas de venda e compra.
    </div>
  `;
}
function renderOfferTable(rows, side) {
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
function renderOfferBoards(itemId) {
    const book = getMarketplaceOrderBookSnapshot();
    const sellView = buildMarketOfferTableView(book, 'sell', itemId);
    const buyView = buildMarketOfferTableView(book, 'buy', itemId);
    return `
    <div class="market-terminal__offers-grid">
      <section class="market-terminal__offers-block market-terminal__offers-block--sell" aria-label="Ofertas de venda">
        <h3 class="market-terminal__offers-title">Sell Offers</h3>
        ${renderOfferTable(sellView.paddedRows, 'sell')}
      </section>
      <section class="market-terminal__offers-block market-terminal__offers-block--buy" aria-label="Ofertas de compra">
        <h3 class="market-terminal__offers-title">Buy Offers</h3>
        ${renderOfferTable(buyView.paddedRows, 'buy')}
      </section>
    </div>
  `;
}
function renderCreateOfferFooter(model) {
    const form = model.offerForm;
    const itemId = form.selectedItemId;
    const sellRows = listMarketSellInventoryRows(model.inventory);
    const canSellItem = itemId ? sellRows.some((row) => row.itemId === itemId) : false;
    const maxSellQty = itemId
        ? sellRows.find((row) => row.itemId === itemId)?.quantity ?? 0
        : 0;
    const qty = itemId
        ? clampMarketOfferQuantity(form.offerSide, itemId, form.quantity, model.inventory)
        : 1;
    const total = qty * Math.max(1, form.unitPriceVolts);
    const sellActive = form.offerSide === 'sell';
    const buyActive = form.offerSide === 'buy';
    const submitDisabled = !itemId
        || (sellActive && !canSellItem)
        || (buyActive && model.wallet.dollarVolt < total);
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
export function buildMarketPanelBodyHtml(model) {
    const selectedId = model.offerForm.selectedItemId;
    const selectedLabel = selectedId ? resolveItemLabel(selectedId) : '—';
    return `
    <p class="market-terminal__balance">
      Saldo: <strong data-market-wallet>${escapeHtml(model.wallet.voltsFormatted)}</strong>
      <span class="market-terminal__fee">Taxa P2P: ${formatMarketplaceFeePercent()}</span>
    </p>

    <div class="market-terminal__workspace">
      <aside class="market-terminal__sidebar" aria-label="Categorias e itens">
        ${renderSidebar(model)}
      </aside>

      <div class="market-terminal__center">
        <p class="market-terminal__item-focus">
          Item: <strong>${escapeHtml(selectedLabel)}</strong>
          ${selectedId ? `<span class="market-terminal__average">${escapeHtml(resolveMarketAverageLabel(selectedId))}</span>` : ''}
        </p>
        ${selectedId ? renderOfferBoards(selectedId) : renderNoItemSelected()}
      </div>
    </div>

    ${renderCreateOfferFooter(model)}
  `;
}
export function ensureMarketSelectedBrowseItem(browseCategory, searchQuery, offerForm) {
    const items = listMarketBrowseItems(browseCategory, searchQuery);
    if (items.length === 0) {
        if (offerForm.selectedItemId === null)
            return offerForm;
        return { ...offerForm, selectedItemId: null };
    }
    const stillVisible = offerForm.selectedItemId
        && items.some((item) => item.itemId === offerForm.selectedItemId);
    if (stillVisible)
        return offerForm;
    const nextItemId = items[0].itemId;
    if (offerForm.selectedItemId === nextItemId)
        return offerForm;
    return {
        ...offerForm,
        selectedItemId: nextItemId,
    };
}
