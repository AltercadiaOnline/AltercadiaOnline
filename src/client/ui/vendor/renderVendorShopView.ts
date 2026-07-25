// @ts-nocheck
import { resolveItemValorBase } from '../../../shared/economy/itemValorEconomy.js';
import { findNpcVendorListing, getNpcVendorListings, resolveNpcPriceSpread, } from '../../../shared/economy/npcVendorCatalog.js';
import { resolveEffectiveNpcBuyUnitPrice, resolveEffectiveNpcSellUnitPrice, resolveInventoryItemSellQuote, resolveNpcPurchaseQuote, resolveNpcSellQuote, } from '../../../shared/economy/npcVendorService.js';
import { formatVoltsShort } from '../../../shared/economy/premiumCurrency.js';
import { resolveNpcVendorRarityBlockReason } from '../../../shared/economy/npcSellRarityPolicy.js';
import { resolveInventoryItemAbbrev, resolveInventoryItemKindClass, resolveInventoryItemLabel, } from '../inventory/inventoryItemDisplay.js';
import { listInventoryNpcBlockedRows, listInventorySellRows, } from './inventorySellRows.js';
function formatMarketValue(value) {
    if (value === null)
        return '—';
    return formatVoltsShort(value);
}
function countInventoryItem(inventory, itemId) {
    let total = 0;
    for (const slot of inventory.slots) {
        if (slot.itemId === itemId && slot.quantity > 0) {
            total += slot.quantity;
        }
    }
    return total;
}
function renderTradeHubIdle() {
    return `
    <div class="vendor-shop__trade-hub-inner vendor-shop__trade-hub-inner--idle">
      <span class="vendor-shop__trade-tag">NODE::IDLE</span>
      <p class="vendor-shop__trade-idle">Selecione um item para comprar ou revender loot do inventário.</p>
    </div>
  `;
}
function renderCatalogTradeHub(model, listing) {
    const label = resolveInventoryItemLabel(listing.itemId);
    const abbrev = resolveInventoryItemAbbrev(listing.itemId);
    const kindClass = resolveInventoryItemKindClass(listing.itemId);
    const owned = countInventoryItem(model.inventory, listing.itemId);
    const buyQuote = resolveNpcPurchaseQuote(listing, model.tradeQuantity);
    const sellQuote = resolveNpcSellQuote(listing, model.tradeQuantity);
    const buyUnit = resolveEffectiveNpcBuyUnitPrice(listing.itemId, listing) ?? 0;
    const sellUnit = resolveEffectiveNpcSellUnitPrice(listing.itemId, listing) ?? 0;
    const buyTotal = buyQuote?.totalVolts ?? buyUnit * model.tradeQuantity;
    const sellTotal = sellQuote?.totalVolts ?? sellUnit * model.tradeQuantity;
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
            Valor de Mercado: <span>${formatMarketValue(listing.marketValueVolts)}</span>
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
          value="${model.tradeQuantity}"
          ${model.gateway.purchaseBusyAttrs}
        />
      </label>
      <p class="vendor-shop__trade-owned">No inventário: ×${owned}</p>

      <div class="vendor-shop__trade-actions">
        <button
          type="button"
          class="vendor-shop__trade-btn vendor-shop__trade-btn--buy"
          data-action="confirm-purchase"
          ${model.gateway.purchaseBusyAttrs}
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
                ${model.gateway.sellBusyAttrs}
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
function renderInventoryTradeHub(model, row) {
    const abbrev = resolveInventoryItemAbbrev(row.itemId);
    const kindClass = resolveInventoryItemKindClass(row.itemId);
    const sellQuote = resolveInventoryItemSellQuote(row.itemId, model.tradeQuantity);
    const sellTotal = sellQuote?.totalVolts ?? row.sellUnitPrice * model.tradeQuantity;
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
          value="${model.tradeQuantity}"
        />
      </label>
      <p class="vendor-shop__trade-owned">No inventário: ×${row.quantity}</p>

      <div class="vendor-shop__trade-actions">
        <button
          type="button"
          class="vendor-shop__trade-btn vendor-shop__trade-btn--sell"
          data-action="confirm-sell"
          ${model.gateway.sellBusyAttrs}
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
function renderListingRow(model, listing) {
    const selected = model.tradeMode === 'catalog' && model.selectedItemId === listing.itemId;
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
              Valor de Mercado: ${formatMarketValue(listing.marketValueVolts)}
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
function renderInventoryBlockedRow(row) {
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
function renderInventorySellRow(model, row) {
    const selected = model.tradeMode === 'inventory' && model.selectedItemId === row.itemId;
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
export function buildVendorShopBodyHtml(model) {
    const listings = getNpcVendorListings(model.vendor.vendorId);
    const inventoryRows = listInventorySellRows(model.inventory);
    const blockedRows = listInventoryNpcBlockedRows(model.inventory);
    const selectedListing = model.tradeMode === 'catalog' && model.selectedItemId
        ? findNpcVendorListing(model.vendor.vendorId, model.selectedItemId)
        : null;
    const selectedInventoryRow = model.tradeMode === 'inventory' && model.selectedItemId
        ? inventoryRows.find((row) => row.itemId === model.selectedItemId) ?? null
        : null;
    return `
    <p class="vendor-shop__balance">
      Saldo: <strong data-vendor-wallet>${model.wallet.voltsFormatted}</strong>
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
        ? listings.map((listing) => renderListingRow(model, listing)).join('')
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
        ? inventoryRows.map((row) => renderInventorySellRow(model, row)).join('')
        : blockedRows.length > 0
            ? ''
            : '<li class="ui-empty">Nenhum loot revendável no inventário.</li>'}
            ${blockedRows.map((row) => renderInventoryBlockedRow(row)).join('')}
            ${inventoryRows.length === 0 && blockedRows.length > 0
        ? '<li class="ui-empty vendor-shop__empty-blocked">Itens de alto valor abaixo — use o Marketplace.</li>'
        : ''}
          </ul>
        </section>
      </div>

      <aside class="vendor-shop__trade-hub" aria-label="Negociação">
        ${selectedListing
        ? renderCatalogTradeHub(model, selectedListing)
        : selectedInventoryRow
            ? renderInventoryTradeHub(model, selectedInventoryRow)
            : renderTradeHubIdle()}
      </aside>
    </div>
  `;
}
export function clampVendorTradeQuantity(inventory, tradeMode, selectedItemId, tradeQuantity) {
    let next = Math.max(1, Math.floor(tradeQuantity));
    if (tradeMode === 'inventory' && selectedItemId) {
        const owned = countInventoryItem(inventory, selectedItemId);
        if (owned > 0)
            next = Math.min(next, owned);
    }
    return next;
}
export { countInventoryItem as countVendorInventoryItem };
