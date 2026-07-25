// @ts-nocheck
import { INVENTORY_SLOT_COUNT } from '../../../shared/character/inventorySlots.js';
import { stacksToInventorySlotsWithStacking } from '../../../shared/character/inventoryStackOps.js';
import { BANK_HUD_GRID_COLUMNS, BANK_HUD_GRID_ROWS, BANK_ITEM_SLOT_CAPACITY, } from '../../../shared/bank/bankConstants.js';
import { sliceBankVaultPageSlots, } from '../../../shared/bank/bankVaultPagination.js';
import { resolveInventoryItemAbbrev, resolveInventoryItemKindClass, resolveInventoryItemLabel, } from '../inventory/inventoryItemDisplay.js';
import { renderInventorySlot } from '../inventory/renderInventorySlot.js';
function isSlotStaged(stagedTransfer, source, slotIndex) {
    return (stagedTransfer?.source === source
        && stagedTransfer.slotIndex === slotIndex);
}
function resolveFlowClass(pendingFlow) {
    if (pendingFlow === 'to-vault')
        return 'is-flow-to-vault';
    if (pendingFlow === 'to-inventory')
        return 'is-flow-to-inventory';
    return '';
}
function renderBridgeColumn(model) {
    const staged = model.stagedTransfer;
    const inFlight = model.inFlight;
    const kindClass = staged ? resolveInventoryItemKindClass(staged.itemId) : '';
    const abbrev = staged ? resolveInventoryItemAbbrev(staged.itemId) : '—';
    const label = staged
        ? resolveInventoryItemLabel(staged.itemId)
        : 'Clique em um item';
    const direction = staged?.source === 'inventory'
        ? '→ Cofre'
        : staged?.source === 'bank'
            ? '← Inventário'
            : 'Ponte';
    const confirmLabel = staged?.source === 'inventory' ? 'Confirmar depósito' : 'Confirmar saque';
    const confirmAction = staged?.source === 'inventory' ? 'confirm-deposit' : 'confirm-withdraw';
    const slotInner = staged
        ? `
      <span class="slot-item__icon" aria-hidden="true">${abbrev}</span>
      ${staged.maxQuantity > 1 ? `<span class="slot-item__meta slot-item__meta--qty">${model.itemQuantity}</span>` : ''}
    `
        : '<span class="ui-bank-bridge__placeholder">—</span>';
    return `
    <aside class="ui-bank-bridge" aria-label="Ponte de transferência">
      <header class="ui-bank-bridge__header">
        <h3 class="ui-bank-bridge__title">${direction}</h3>
      </header>

      <div
        class="ui-bank-bridge__slot slot-item ${kindClass}${staged ? ' slot-item--filled is-staged' : ' is-empty'}"
        aria-live="polite"
        ${staged ? `data-item-id="${staged.itemId}"` : ''}
        aria-label="${staged ? `${label}, quantidade ${model.itemQuantity}` : 'Nenhum item na ponte'}"
      >
        ${slotInner}
      </div>

      <p class="ui-bank-bridge__label">${label}</p>

      <label class="ui-market-exchange-label ui-bank-bridge__qty">
        Quantidade
        <input
          type="number"
          min="1"
          step="1"
          class="ui-market-exchange-input"
          data-qty-input
          value="${model.itemQuantity}"
          ${staged && !inFlight ? '' : 'disabled'}
        />
      </label>

      <div class="ui-bank-bridge__actions">
        <button
          type="button"
          class="ui-market-exchange-btn ui-bank-bridge__confirm"
          data-action="${confirmAction}"
          ${staged && !inFlight ? '' : 'disabled'}
        >
          ${confirmLabel}
        </button>
        <button
          type="button"
          class="ui-market-exchange-btn ui-bank-bridge__clear"
          data-action="clear-staged"
          ${staged && !inFlight ? '' : 'disabled'}
        >
          Limpar
        </button>
      </div>
    </aside>
  `;
}
function renderVaultPagination(currentPage, pageCount) {
    if (pageCount <= 1) {
        return '<div class="ui-bank-vault-pagination ui-bank-vault-pagination--single" aria-hidden="true"></div>';
    }
    const tabs = Array.from({ length: pageCount }, (_, page) => {
        const active = page === currentPage ? ' is-active' : '';
        return `
      <button
        type="button"
        class="ui-bank-vault-pagination__tab${active}"
        data-vault-page="${page}"
        aria-label="Página ${page + 1}"
        aria-current="${page === currentPage ? 'page' : 'false'}"
      >
        ${page + 1}
      </button>
    `;
    }).join('');
    return `
    <nav class="ui-bank-vault-pagination" aria-label="Páginas do cofre">
      <button
        type="button"
        class="ui-bank-vault-pagination__nav"
        data-action="vault-prev"
        aria-label="Página anterior"
        ${currentPage <= 0 ? 'disabled' : ''}
      >
        Anterior
      </button>
      <div class="ui-bank-vault-pagination__tabs" role="tablist">
        ${tabs}
      </div>
      <button
        type="button"
        class="ui-bank-vault-pagination__nav"
        data-action="vault-next"
        aria-label="Próxima página"
        ${currentPage >= pageCount - 1 ? 'disabled' : ''}
      >
        Próxima
      </button>
    </nav>
  `;
}
function renderItemsTab(model) {
    const flowClass = resolveFlowClass(model.pendingFlow);
    const inventorySlots = model.inventory.slots;
    const allVaultSlots = stacksToInventorySlotsWithStacking(model.bankStorage.itemStacks, BANK_ITEM_SLOT_CAPACITY);
    const vaultPage = sliceBankVaultPageSlots(allVaultSlots, model.vaultCurrentPage, model.bankStorage.itemCapacity);
    const inventoryHtml = inventorySlots
        .map((slot, index) => renderInventorySlot({
        index,
        slot,
        context: 'bank-inventory',
        selected: isSlotStaged(model.stagedTransfer, 'inventory', index),
    }))
        .join('');
    const vaultHtml = vaultPage.pageSlots
        .map((slot, localIndex) => {
        const globalIndex = vaultPage.globalOffset + localIndex;
        return renderInventorySlot({
            index: globalIndex,
            slot,
            context: 'bank-vault',
            selected: isSlotStaged(model.stagedTransfer, 'bank', globalIndex),
        });
    })
        .join('');
    return {
        vaultPageIndex: vaultPage.pageIndex,
        html: `
      <div class="ui-bank-items-layout ${flowClass}" data-bank-items-layout>
        <div class="ui-bank-items-flow" aria-hidden="true">
          <span class="ui-bank-items-flow__packet"></span>
        </div>

        <section class="ui-bank-items-column" aria-label="Inventário">
          <header class="ui-bank-items-column__header">
            <h3 class="ui-bank-items-column__title">Inventário</h3>
            <span class="ui-bank-items-column__meta">${model.inventory.used} / ${model.inventory.capacity}</span>
          </header>
          <div class="ui-bank-items-column__grid-wrap">
            <div
              class="slot-grid"
              role="grid"
              aria-label="Itens no inventário"
              style="--slot-cols: ${BANK_HUD_GRID_COLUMNS}; --slot-rows: ${BANK_HUD_GRID_ROWS}"
            >
              ${inventoryHtml}
            </div>
            <div class="ui-bank-items-column__grid-spacer" aria-hidden="true"></div>
          </div>
        </section>

        ${renderBridgeColumn(model)}

        <section class="ui-bank-items-column" aria-label="Cofre">
          <header class="ui-bank-items-column__header">
            <h3 class="ui-bank-items-column__title">Cofre</h3>
            <span class="ui-bank-items-column__meta">${model.bankStorage.itemsUsed} / ${model.bankStorage.itemCapacity}</span>
          </header>
          <div class="ui-bank-items-column__grid-wrap">
            <div
              class="slot-grid"
              role="grid"
              aria-label="Itens no cofre, página ${vaultPage.pageIndex + 1} de ${vaultPage.pageCount}"
              style="--slot-cols: ${BANK_HUD_GRID_COLUMNS}; --slot-rows: ${BANK_HUD_GRID_ROWS}"
            >
              ${vaultHtml}
            </div>
            ${renderVaultPagination(vaultPage.pageIndex, vaultPage.pageCount)}
          </div>
        </section>
      </div>
    `,
    };
}
function renderCurrencyBlock(options) {
    const walletDataAttr = options.inputKey === 'volts' ? 'data-wallet-volts' : 'data-wallet-alter';
    const bankDataAttr = options.inputKey === 'volts' ? 'data-bank-volts' : 'data-bank-alter';
    return `
    <section class="ui-market-exchange ui-bank-currency-block" aria-label="${options.title}">
      <h3 class="ui-market-section-title">${options.title}</h3>
      <div class="ui-market-balances ui-bank-currency-balances">
        <div class="ui-market-balance ${options.balanceClass}">
          <span class="ui-market-balance-label">${options.walletLabel}</span>
          <span class="ui-market-balance-value" ${walletDataAttr}>${options.walletValue}</span>
        </div>
        <div class="ui-market-balance ${options.balanceClass}">
          <span class="ui-market-balance-label">Cofre</span>
          <span class="ui-market-balance-value" ${bankDataAttr}>${options.bankValue}</span>
        </div>
      </div>
      <div class="ui-market-exchange-form">
        <label class="ui-market-exchange-label">
          Valor
          <input
            type="number"
            min="1"
            step="1"
            class="ui-market-exchange-input"
            data-currency-input="${options.inputKey}"
            placeholder="0"
          />
        </label>
        <div class="ui-bank-currency-actions">
          <button type="button" class="ui-market-exchange-btn" data-action="${options.depositAction}">
            Depositar
          </button>
          <button
            type="button"
            class="ui-market-exchange-btn ui-bank-currency-btn--secondary"
            data-action="${options.withdrawAction}"
          >
            Sacar
          </button>
        </div>
      </div>
    </section>
  `;
}
function renderCurrencyTab(model) {
    return `
    <div class="ui-bank-currency-layout">
      ${renderCurrencyBlock({
        title: 'VOLTS',
        balanceClass: 'ui-market-balance--volts',
        walletLabel: 'Carteira',
        walletValue: model.wallet.voltsFormatted,
        bankValue: model.bankStorage.voltsFormatted,
        inputKey: 'volts',
        depositAction: 'deposit-volts',
        withdrawAction: 'withdraw-volts',
    })}
      ${renderCurrencyBlock({
        title: 'ALTER COINS',
        balanceClass: 'ui-market-balance--alter',
        walletLabel: 'Carteira',
        walletValue: model.wallet.alterFormatted,
        bankValue: model.bankStorage.alterFormatted,
        inputKey: 'alter',
        depositAction: 'deposit-alter',
        withdrawAction: 'withdraw-alter',
    })}
    </div>
  `;
}
export function buildBankPanelBodyHtml(model) {
    const tabItemsClass = model.activeTab === 'items' ? 'is-active' : '';
    const tabCurrencyClass = model.activeTab === 'currency' ? 'is-active' : '';
    if (model.activeTab === 'items') {
        const itemsTab = renderItemsTab(model);
        return {
            vaultPageIndex: itemsTab.vaultPageIndex,
            html: `
        <nav class="ui-bank-tabs" aria-label="Abas do banco">
          <button type="button" class="ui-bank-tab ${tabItemsClass}" data-tab="items">Depósito de Itens</button>
          <button type="button" class="ui-bank-tab ${tabCurrencyClass}" data-tab="currency">Depósito de Moedas</button>
        </nav>
        ${itemsTab.html}
      `,
        };
    }
    return {
        vaultPageIndex: model.vaultCurrentPage,
        html: `
      <nav class="ui-bank-tabs" aria-label="Abas do banco">
        <button type="button" class="ui-bank-tab ${tabItemsClass}" data-tab="items">Depósito de Itens</button>
        <button type="button" class="ui-bank-tab ${tabCurrencyClass}" data-tab="currency">Depósito de Moedas</button>
      </nav>
      ${renderCurrencyTab(model)}
    `,
    };
}
export function shouldClearStagedOnVaultPageChange(stagedTransfer, nextPageIndex) {
    if (stagedTransfer?.source !== 'bank')
        return false;
    const pageStart = nextPageIndex * INVENTORY_SLOT_COUNT;
    const pageEnd = pageStart + INVENTORY_SLOT_COUNT;
    return (stagedTransfer.slotIndex < pageStart
        || stagedTransfer.slotIndex >= pageEnd);
}
