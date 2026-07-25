// @ts-nocheck
import { filterLabListingsByTab, findNpcVendorListing, getNpcVendorListings, LAB_SHOP_TABS, } from '../../../shared/economy/npcVendorCatalog.js';
import { resolveEffectiveNpcBuyUnitPrice, resolveNpcPurchaseQuote, } from '../../../shared/economy/npcVendorService.js';
import { formatVoltsShort } from '../../../shared/economy/premiumCurrency.js';
import { resolveInventoryItemAbbrev, resolveInventoryItemKindClass, resolveInventoryItemLabel, } from '../inventory/inventoryItemDisplay.js';
import { buildConsumableShopEffectLines, resolveConsumableShopSubtitle, } from './consumableShopDisplay.js';
import { resolveLabQuantityPresets, resolveMaxLabPurchaseQuantity, } from './labPurchaseHelpers.js';
function countInventoryItem(inventory, itemId) {
    let total = 0;
    for (const slot of inventory.slots) {
        if (slot.itemId === itemId && slot.quantity > 0) {
            total += slot.quantity;
        }
    }
    return total;
}
function renderTabButton(model, tabId, label) {
    const active = model.activeTab === tabId;
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
function renderDetailIdle() {
    return `
    <div class="laboratory-shop__detail-inner laboratory-shop__detail-inner--idle">
      <span class="laboratory-shop__detail-tag">PREPARO::IDLE</span>
      <p class="laboratory-shop__detail-idle">
        Selecione um consumível para ver efeitos e comprar em pilha.
      </p>
    </div>
  `;
}
function renderPurchasePanel(model, listing) {
    const label = resolveInventoryItemLabel(listing.itemId);
    const abbrev = resolveInventoryItemAbbrev(listing.itemId);
    const kindClass = resolveInventoryItemKindClass(listing.itemId);
    const effectLines = buildConsumableShopEffectLines(listing.itemId);
    const subtitle = resolveConsumableShopSubtitle(listing.itemId);
    const owned = countInventoryItem(model.inventory, listing.itemId);
    const buyUnit = resolveEffectiveNpcBuyUnitPrice(listing.itemId, listing) ?? 0;
    const maxQty = resolveMaxLabPurchaseQuantity(listing.itemId, model.inventory, model.wallet.dollarVolt, buyUnit);
    const qty = Math.min(model.purchaseQuantity, maxQty);
    const quote = resolveNpcPurchaseQuote(listing, qty);
    const total = quote?.totalVolts ?? buyUnit * qty;
    const presets = resolveLabQuantityPresets(maxQty);
    const stackable = maxQty > 1 || presets.length > 1;
    return `
    <div class="laboratory-shop__detail-inner laboratory-shop__detail-inner--active ${kindClass}">
      <span class="laboratory-shop__detail-tag">PREPARO::${model.activeTab.toUpperCase()}</span>
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
          ${maxQty >= 1 && model.wallet.dollarVolt >= total ? '' : 'disabled'}
        >
          Comprar <strong data-lab-buy-total>${formatVoltsShort(total)}</strong>
        </button>
      </div>
    </div>
  `;
}
function renderListingRow(model, listing) {
    const selected = model.selectedItemId === listing.itemId;
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
export function buildLaboratoryShopBodyHtml(model) {
    const listings = filterLabListingsByTab(getNpcVendorListings(model.vendor.vendorId), model.activeTab);
    const selectedListing = model.selectedItemId
        ? findNpcVendorListing(model.vendor.vendorId, model.selectedItemId)
        : null;
    return `
    <p class="laboratory-shop__balance">
      Saldo: <strong data-lab-wallet>${model.wallet.voltsFormatted}</strong>
    </p>
    <p class="laboratory-shop__hint">
      Prepare-se antes da jornada — poções, runas e livros vão direto ao inventário e ao combate.
    </p>

    <nav class="laboratory-shop__tabs" aria-label="Categorias do laboratório">
      ${LAB_SHOP_TABS.map((tab) => renderTabButton(model, tab.id, tab.label)).join('')}
    </nav>

    <div class="laboratory-shop__layout">
      <section class="laboratory-shop__catalog" aria-label="Catálogo">
        <div class="laboratory-shop__list-head" aria-hidden="true">
          <span class="laboratory-shop__col laboratory-shop__col--item">Item</span>
          <span class="laboratory-shop__col laboratory-shop__col--price">Preço</span>
        </div>
        <ul class="laboratory-shop__list">
          ${listings.length > 0
        ? listings.map((listing) => renderListingRow(model, listing)).join('')
        : '<li class="ui-empty">Nenhum item nesta categoria.</li>'}
        </ul>
      </section>

      <aside class="laboratory-shop__detail" aria-label="Detalhes e compra">
        ${selectedListing
        ? renderPurchasePanel(model, selectedListing)
        : renderDetailIdle()}
      </aside>
    </div>
  `;
}
export function clampLabPurchaseQuantity(listing, inventory, walletVolts, purchaseQuantity) {
    const buyUnit = resolveEffectiveNpcBuyUnitPrice(listing.itemId, listing) ?? 0;
    const maxQty = resolveMaxLabPurchaseQuantity(listing.itemId, inventory, walletVolts, buyUnit);
    return Math.max(1, Math.min(Math.floor(purchaseQuantity), maxQty));
}
