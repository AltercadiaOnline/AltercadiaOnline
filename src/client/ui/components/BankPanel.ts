import { INVENTORY_SLOT_COUNT } from '../../../shared/character/inventorySlots.js';
import { stacksToInventorySlotsWithStacking } from '../../../shared/character/inventoryStackOps.js';
import type { BankStorageDataSnapshot } from '../../../shared/playerDataSnapshots.js';
import type { WalletSnapshot } from '../../../shared/playerDataSnapshots.js';
import type { IDataStore } from '../../../shared/IDataStore.js';
import {
  BANK_HUD_GRID_COLUMNS,
  BANK_HUD_GRID_ROWS,
  BANK_ITEM_SLOT_CAPACITY,
  BankCurrencyType,
} from '../../../shared/bank/bankConstants.js';
import { normalizeBankCurrencyAmount } from '../../../shared/bank/bankCurrencyRules.js';
import {
  clampBankVaultPageIndex,
  sliceBankVaultPageSlots,
} from '../../../shared/bank/bankVaultPagination.js';
import { BaseUIComponent } from '../UIComponent.js';
import { getActionDispatcher } from '../../ActionDispatcher.js';
import { getDataStore } from '../../economy/economyLayer.js';
import { getPendingIntentRegistry } from '../../sync/pendingIntentRegistry.js';
import {
  resolveInventoryItemAbbrev,
  resolveInventoryItemKindClass,
  resolveInventoryItemLabel,
} from '../inventory/inventoryItemDisplay.js';
import { renderInventorySlot } from '../inventory/renderInventorySlot.js';
import { alertSystem } from '../alertSystem.js';
import { getItemById } from '../../../shared/items/itemCatalog.js';
import { uiEvents, UIEventType } from '../uiEvents.js';

type BankTab = 'items' | 'currency';
type ItemSource = 'inventory' | 'bank';
type FlowDirection = 'to-vault' | 'to-inventory';

type StagedTransfer = {
  readonly source: ItemSource;
  readonly slotIndex: number;
  readonly itemId: string;
  readonly maxQuantity: number;
};

const FLOW_ANIMATION_MS = 720;

/** HUD do Banqueiro — inventário e cofre com slots padronizados. */
export class BankPanel extends BaseUIComponent {
  private readonly dispatcher = getActionDispatcher();

  /** Resolvido em runtime — o mock só existe após initEconomyLayer(). */
  private get dataStore() {
    return getDataStore();
  }

  private wallet!: WalletSnapshot;
  private inventory!: ReturnType<IDataStore['getInventory']>;
  private bankStorage!: BankStorageDataSnapshot;
  private activeTab: BankTab = 'items';
  /** Item aguardando confirmação na ponte entre inventário e cofre. */
  private stagedTransfer: StagedTransfer | null = null;
  private vaultCurrentPage = 0;
  private itemQuantity = 1;
  private pendingFlow: FlowDirection | null = null;
  private flowClearTimer: ReturnType<typeof setTimeout> | null = null;
  private unbindTooltipListeners: (() => void) | null = null;

  private unsubWallet: (() => void) | null = null;
  private unsubInventory: (() => void) | null = null;
  private unsubBank: (() => void) | null = null;
  private unsubBankSuccess: (() => void) | null = null;
  private unsubBankFail: (() => void) | null = null;
  private unsubBankBalance: (() => void) | null = null;

  constructor() {
    super({ id: 'bank', rootClassName: 'ui-panel ui-panel--bank ui-panel--movable' });
  }

  /** Primeiro render() ocorre em mount() — snapshots precisam existir antes do template. */
  override mount(parent: HTMLElement): void {
    if (!this.root) {
      this.refreshSnapshots();
    }
    super.mount(parent);
  }

  protected override onOpen(): void {
    this.teardownDataStoreSubscriptions();
    this.refreshSnapshots();
    this.bindDataStoreSubscriptions();
  }

  private bindDataStoreSubscriptions(): void {
    const store = this.dataStore;
    this.unsubWallet = store.subscribe('wallet', (wallet) => {
      this.wallet = wallet;
      if (this.isOpen()) this.render();
    });
    this.unsubInventory = store.subscribe('inventory', (inventory) => {
      this.inventory = inventory;
      if (this.isOpen()) this.render();
    });
    this.unsubBank = store.subscribe('bankStorage', (bank) => {
      this.bankStorage = bank;
      this.vaultCurrentPage = clampBankVaultPageIndex(
        this.vaultCurrentPage,
        bank.itemCapacity,
      );
      if (this.isOpen()) {
        this.patchBankCurrencyBalances();
        this.setBankControlsDisabled(this.isBankTransactionInFlight());
        this.render();
      }
    });
    const onBankTxConfirmed = (): void => {
      this.clearPendingTransfer();
      this.refreshSnapshots();
      if (this.isOpen()) {
        this.patchBankCurrencyBalances();
        this.setBankControlsDisabled(this.isBankTransactionInFlight());
        if (this.activeTab === 'items') this.render();
      }
    };
    this.unsubBankSuccess = uiEvents.on(UIEventType.BANK_UPDATE_SUCCESS, onBankTxConfirmed);
    this.unsubBankFail = uiEvents.on(UIEventType.BANK_TRANSACTION_FAILED, () => {
      this.clearPendingTransfer();
      if (this.isOpen()) {
        this.setBankControlsDisabled(false);
        this.render();
      }
    });
    this.unsubBankBalance = uiEvents.on(UIEventType.BANK_BALANCE_UPDATED, (payload) => {
      this.bankStorage = {
        ...this.bankStorage,
        currencies: {
          dollarVolt: payload.dollarVolt,
          alterCoins: payload.alterCoins,
        },
        voltsFormatted: payload.voltsFormatted,
        alterFormatted: payload.alterFormatted,
        ...(payload.revision !== undefined ? { revision: payload.revision } : {}),
      };
      if (this.isOpen()) {
        this.patchBankCurrencyBalances();
        this.setBankControlsDisabled(this.isBankTransactionInFlight());
      }
    });
  }

  private teardownDataStoreSubscriptions(): void {
    this.unsubWallet?.();
    this.unsubInventory?.();
    this.unsubBank?.();
    this.unsubWallet = null;
    this.unsubInventory = null;
    this.unsubBank = null;
    this.unsubBankSuccess?.();
    this.unsubBankSuccess = null;
    this.unsubBankFail?.();
    this.unsubBankFail = null;
    this.unsubBankBalance?.();
    this.unsubBankBalance = null;
  }

  protected override onClose(): void {
    this.teardownDataStoreSubscriptions();
    this.unbindTooltipListeners?.();
    this.unbindTooltipListeners = null;
    if (this.flowClearTimer) {
      clearTimeout(this.flowClearTimer);
      this.flowClearTimer = null;
    }
    this.clearPendingTransfer();
    uiEvents.emit(UIEventType.HIDE_TOOLTIP, {});
  }

  private refreshSnapshots(): void {
    this.wallet = this.dataStore.getWallet();
    this.inventory = this.dataStore.getInventory();
    this.bankStorage = this.dataStore.getBankStorage();
  }

  private isBankTransactionInFlight(): boolean {
    return this.pendingFlow !== null || getPendingIntentRegistry().hasPendingBankTransaction();
  }

  private patchBankCurrencyBalances(): void {
    if (!this.root) return;
    const voltsEl = this.root.querySelector<HTMLElement>('[data-bank-volts]');
    const alterEl = this.root.querySelector<HTMLElement>('[data-bank-alter]');
    if (voltsEl) voltsEl.textContent = this.bankStorage.voltsFormatted;
    if (alterEl) alterEl.textContent = this.bankStorage.alterFormatted;
  }

  private setBankControlsDisabled(disabled: boolean): void {
    if (!this.root) return;
    const flag = disabled ? 'true' : 'false';
    for (const el of this.root.querySelectorAll<HTMLButtonElement>(
      '[data-action="confirm-deposit"], [data-action="confirm-withdraw"], [data-action="clear-staged"], '
        + '[data-action="deposit-volts"], [data-action="withdraw-volts"], '
        + '[data-action="deposit-alter"], [data-action="withdraw-alter"]',
    )) {
      el.disabled = disabled;
    }
    for (const el of this.root.querySelectorAll<HTMLElement>('[data-bank-select-slot]')) {
      if (disabled) el.setAttribute('aria-disabled', flag);
      else el.removeAttribute('aria-disabled');
    }
    const qtyInput = this.root.querySelector<HTMLInputElement>('[data-qty-input]');
    if (qtyInput) qtyInput.disabled = disabled || !this.stagedTransfer;
  }

  createTemplate(): string {
    const tabItemsClass = this.activeTab === 'items' ? 'is-active' : '';
    const tabCurrencyClass = this.activeTab === 'currency' ? 'is-active' : '';

    return `
      <header class="ui-panel__header" data-panel-drag-handle>
        <h2 class="ui-panel__title">Banco — Banqueiro</h2>
        <button type="button" class="ui-panel__close" data-action="close" aria-label="Fechar Banco">×</button>
      </header>
      <div class="ui-panel__body ui-panel__body--bank">
        <nav class="ui-bank-tabs" aria-label="Abas do banco">
          <button type="button" class="ui-bank-tab ${tabItemsClass}" data-tab="items">Depósito de Itens</button>
          <button type="button" class="ui-bank-tab ${tabCurrencyClass}" data-tab="currency">Depósito de Moedas</button>
        </nav>

        ${this.activeTab === 'items' ? this.renderItemsTab() : this.renderCurrencyTab()}
      </div>
    `;
  }

  private renderItemsTab(): string {
    const flowClass = this.resolveFlowClass();
    const inventorySlots = this.inventory.slots;
    const allVaultSlots = stacksToInventorySlotsWithStacking(
      this.bankStorage.itemStacks,
      BANK_ITEM_SLOT_CAPACITY,
    );
    const vaultPage = sliceBankVaultPageSlots(
      allVaultSlots,
      this.vaultCurrentPage,
      this.bankStorage.itemCapacity,
    );
    this.vaultCurrentPage = vaultPage.pageIndex;

    const inventoryHtml = inventorySlots
      .map((slot, index) =>
        renderInventorySlot({
          index,
          slot,
          context: 'bank-inventory',
          selected: this.isSlotStaged('inventory', index),
        }),
      )
      .join('');

    const vaultHtml = vaultPage.pageSlots
      .map((slot, localIndex) => {
        const globalIndex = vaultPage.globalOffset + localIndex;
        return renderInventorySlot({
          index: globalIndex,
          slot,
          context: 'bank-vault',
          selected: this.isSlotStaged('bank', globalIndex),
        });
      })
      .join('');

    return `
      <div class="ui-bank-items-layout ${flowClass}" data-bank-items-layout>
        <div class="ui-bank-items-flow" aria-hidden="true">
          <span class="ui-bank-items-flow__packet"></span>
        </div>

        <section class="ui-bank-items-column" aria-label="Inventário">
          <header class="ui-bank-items-column__header">
            <h3 class="ui-bank-items-column__title">Inventário</h3>
            <span class="ui-bank-items-column__meta">${this.inventory.used} / ${this.inventory.capacity}</span>
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

        ${this.renderBridgeColumn()}

        <section class="ui-bank-items-column" aria-label="Cofre">
          <header class="ui-bank-items-column__header">
            <h3 class="ui-bank-items-column__title">Cofre</h3>
            <span class="ui-bank-items-column__meta">${this.bankStorage.itemsUsed} / ${this.bankStorage.itemCapacity}</span>
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
            ${this.renderVaultPagination(vaultPage.pageIndex, vaultPage.pageCount)}
          </div>
        </section>
      </div>
    `;
  }

  private isSlotStaged(source: ItemSource, slotIndex: number): boolean {
    return (
      this.stagedTransfer?.source === source
      && this.stagedTransfer.slotIndex === slotIndex
    );
  }

  private renderBridgeColumn(): string {
    const staged = this.stagedTransfer;
    const inFlight = this.isBankTransactionInFlight();
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
        ${staged.maxQuantity > 1 ? `<span class="slot-item__meta slot-item__meta--qty">${this.itemQuantity}</span>` : ''}
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
          aria-label="${staged ? `${label}, quantidade ${this.itemQuantity}` : 'Nenhum item na ponte'}"
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
            value="${this.itemQuantity}"
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

  private renderVaultPagination(currentPage: number, pageCount: number): string {
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

  private setVaultPage(pageIndex: number): void {
    this.vaultCurrentPage = clampBankVaultPageIndex(
      pageIndex,
      this.bankStorage.itemCapacity,
    );
    if (this.stagedTransfer?.source === 'bank') {
      const pageStart = this.vaultCurrentPage * INVENTORY_SLOT_COUNT;
      const pageEnd = pageStart + INVENTORY_SLOT_COUNT;
      if (
        this.stagedTransfer.slotIndex < pageStart
        || this.stagedTransfer.slotIndex >= pageEnd
      ) {
        this.stagedTransfer = null;
      }
    }
    this.render();
  }

  private renderCurrencyTab(): string {
    return `
      <div class="ui-bank-currency-layout">
        ${this.renderCurrencyBlock({
          title: 'VOLTS',
          balanceClass: 'ui-market-balance--volts',
          walletLabel: 'Carteira',
          walletValue: this.wallet.voltsFormatted,
          bankValue: this.bankStorage.voltsFormatted,
          inputKey: 'volts',
          depositAction: 'deposit-volts',
          withdrawAction: 'withdraw-volts',
        })}
        ${this.renderCurrencyBlock({
          title: 'ALTER COINS',
          balanceClass: 'ui-market-balance--alter',
          walletLabel: 'Carteira',
          walletValue: this.wallet.alterFormatted,
          bankValue: this.bankStorage.alterFormatted,
          inputKey: 'alter',
          depositAction: 'deposit-alter',
          withdrawAction: 'withdraw-alter',
        })}
      </div>
    `;
  }

  private renderCurrencyBlock(options: {
    readonly title: string;
    readonly balanceClass: string;
    readonly walletLabel: string;
    readonly walletValue: string;
    readonly bankValue: string;
    readonly inputKey: string;
    readonly depositAction: string;
    readonly withdrawAction: string;
  }): string {
    const walletDataAttr =
      options.inputKey === 'volts' ? 'data-wallet-volts' : 'data-wallet-alter';
    const bankDataAttr =
      options.inputKey === 'volts' ? 'data-bank-volts' : 'data-bank-alter';

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

  private resolveFlowClass(): string {
    if (this.pendingFlow === 'to-vault') return 'is-flow-to-vault';
    if (this.pendingFlow === 'to-inventory') return 'is-flow-to-inventory';
    return '';
  }

  private resolveStagedTransfer(): StagedTransfer | null {
    if (!this.stagedTransfer) return null;

    if (this.stagedTransfer.source === 'inventory') {
      const slot = this.inventory.slots[this.stagedTransfer.slotIndex];
      if (!slot?.itemId || slot.quantity <= 0) return null;
      if (slot.itemId !== this.stagedTransfer.itemId) return null;
      if (this.isCurrencyItem(slot.itemId)) return null;
      if ((slot.lockedQuantity ?? 0) > 0) return null;
      return {
        ...this.stagedTransfer,
        maxQuantity: slot.quantity,
      };
    }

    const vaultSlots = stacksToInventorySlotsWithStacking(
      this.bankStorage.itemStacks,
      BANK_ITEM_SLOT_CAPACITY,
    );
    const slot = vaultSlots[this.stagedTransfer.slotIndex];
    if (!slot?.itemId || slot.quantity <= 0) return null;
    if (slot.itemId !== this.stagedTransfer.itemId) return null;
    if (this.isCurrencyItem(slot.itemId)) return null;
    return {
      ...this.stagedTransfer,
      maxQuantity: slot.quantity,
    };
  }

  private stageItemFromSlot(source: ItemSource, slotIndex: number): void {
    if (source === 'inventory') {
      const slot = this.inventory.slots[slotIndex];
      if (!slot?.itemId || slot.quantity <= 0) return;
      if (this.isCurrencyItem(slot.itemId)) return;
      if ((slot.lockedQuantity ?? 0) > 0) {
        alertSystem('Item bloqueado — aguarde a transação bancária anterior.');
        return;
      }
      if (
        this.stagedTransfer?.source === source
        && this.stagedTransfer.slotIndex === slotIndex
      ) {
        this.stagedTransfer = null;
        this.itemQuantity = 1;
        this.render();
        return;
      }
      this.stagedTransfer = {
        source,
        slotIndex,
        itemId: slot.itemId,
        maxQuantity: slot.quantity,
      };
    } else {
      const vaultSlots = stacksToInventorySlotsWithStacking(
        this.bankStorage.itemStacks,
        BANK_ITEM_SLOT_CAPACITY,
      );
      const slot = vaultSlots[slotIndex];
      if (!slot?.itemId || slot.quantity <= 0) return;
      if (this.isCurrencyItem(slot.itemId)) return;
      if (
        this.stagedTransfer?.source === source
        && this.stagedTransfer.slotIndex === slotIndex
      ) {
        this.stagedTransfer = null;
        this.itemQuantity = 1;
        this.render();
        return;
      }
      this.stagedTransfer = {
        source,
        slotIndex,
        itemId: slot.itemId,
        maxQuantity: slot.quantity,
      };
    }

    this.itemQuantity = 1;
    this.clampQuantityToSelection();
    this.render();
  }

  private isCurrencyItem(itemId: string): boolean {
    return itemId === 'dollar_volt' || itemId === 'gold';
  }

  private clampQuantityToSelection(): void {
    const staged = this.resolveStagedTransfer();
    if (!staged) {
      this.itemQuantity = 1;
      return;
    }
    this.itemQuantity = Math.max(1, Math.min(this.itemQuantity, staged.maxQuantity));
  }

  private clearPendingTransfer(): void {
    if (this.flowClearTimer) {
      clearTimeout(this.flowClearTimer);
      this.flowClearTimer = null;
    }
    this.pendingFlow = null;
    this.stagedTransfer = null;
    this.itemQuantity = 1;
  }

  private scheduleFlowClear(): void {
    if (this.flowClearTimer) clearTimeout(this.flowClearTimer);
    this.flowClearTimer = setTimeout(() => {
      this.clearPendingTransfer();
      if (this.isOpen()) this.render();
    }, FLOW_ANIMATION_MS);
  }

  protected override afterRender(): void {
    this.unbindTooltipListeners?.();
    if (!this.root) return;
    this.patchBankCurrencyBalances();
    this.setBankControlsDisabled(this.isBankTransactionInFlight());
    if (this.activeTab !== 'items') return;

    const cleanups: Array<() => void> = [];

    for (const slot of this.root.querySelectorAll<HTMLElement>('[data-item-id]')) {
      const onEnter = (event: MouseEvent): void => {
        const itemId = slot.dataset.itemId;
        if (!itemId) return;
        const item = getItemById(itemId);
        if (!item) return;
        uiEvents.emit(UIEventType.SHOW_TOOLTIP, {
          data: { kind: 'item', data: item },
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

  protected override bindEvents(): void {
    this.root?.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;

      const actionEl = target.closest<HTMLElement>('[data-action]');
      const action = actionEl?.dataset.action;

      if (action === 'close') {
        this.close();
        return;
      }

      const tabEl = target.closest<HTMLElement>('[data-tab]');
      const tab = tabEl?.dataset.tab as BankTab | undefined;
      if (tab === 'items' || tab === 'currency') {
        this.activeTab = tab;
        this.render();
        return;
      }

      if (action === 'vault-prev') {
        this.setVaultPage(this.vaultCurrentPage - 1);
        return;
      }

      if (action === 'vault-next') {
        this.setVaultPage(this.vaultCurrentPage + 1);
        return;
      }

      const vaultPageBtn = target.closest<HTMLElement>('[data-vault-page]');
      if (vaultPageBtn?.dataset.vaultPage !== undefined) {
        this.setVaultPage(Number(vaultPageBtn.dataset.vaultPage));
        return;
      }

      const slotBtn = target.closest<HTMLElement>('[data-bank-select-slot]');
      if (slotBtn) {
        if (this.isBankTransactionInFlight()) return;
        const slotIndex = Number(slotBtn.dataset.bankSelectSlot);
        const source = slotBtn.dataset.itemSource as ItemSource | undefined;
        if (!Number.isFinite(slotIndex) || !source) return;
        this.stageItemFromSlot(source, slotIndex);
        return;
      }

      if (action === 'clear-staged') {
        this.stagedTransfer = null;
        this.itemQuantity = 1;
        this.render();
        return;
      }

      if (action === 'confirm-deposit') {
        const staged = this.resolveStagedTransfer();
        if (staged?.source === 'inventory') {
          this.dispatchItem('DEPOSIT_ITEM', staged.itemId, 'to-vault');
        }
        return;
      }

      if (action === 'confirm-withdraw') {
        const staged = this.resolveStagedTransfer();
        if (staged?.source === 'bank') {
          this.dispatchItem('WITHDRAW_ITEM', staged.itemId, 'to-inventory');
        }
        return;
      }

      if (action === 'deposit-item' || action === 'withdraw-item') {
        return;
      }

      if (action === 'deposit-volts') {
        this.dispatchCurrency('DEPOSIT_CURRENCY', BankCurrencyType.Volts);
        return;
      }

      if (action === 'withdraw-volts') {
        this.dispatchCurrency('WITHDRAW_CURRENCY', BankCurrencyType.Volts);
        return;
      }

      if (action === 'deposit-alter') {
        this.dispatchCurrency('DEPOSIT_CURRENCY', BankCurrencyType.Alter);
        return;
      }

      if (action === 'withdraw-alter') {
        this.dispatchCurrency('WITHDRAW_CURRENCY', BankCurrencyType.Alter);
      }
    });

    this.root?.addEventListener('change', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement)) return;
      if (target.matches('[data-qty-input]')) {
        this.itemQuantity = Math.max(1, Math.floor(Number(target.value) || 1));
        this.clampQuantityToSelection();
        if (String(this.itemQuantity) !== target.value) {
          target.value = String(this.itemQuantity);
        }
        if (this.stagedTransfer) this.render();
      }
    });
  }

  private dispatchItem(
    type: 'DEPOSIT_ITEM' | 'WITHDRAW_ITEM',
    itemId: string,
    flow: FlowDirection,
  ): void {
    if (!itemId || this.isBankTransactionInFlight()) return;

    const result = this.dispatcher.dispatch({
      type,
      payload: { itemId, quantity: this.itemQuantity },
    });
    if (!result.ok) {
      alertSystem(result.reason);
      return;
    }
    if (result.status === 'applied' || result.status === 'pending') {
      this.pendingFlow = flow;
      this.render();
      if (result.status === 'applied') {
        this.scheduleFlowClear();
      }
    }
  }

  private dispatchCurrency(
    type: 'DEPOSIT_CURRENCY' | 'WITHDRAW_CURRENCY',
    currency: typeof BankCurrencyType.Volts | typeof BankCurrencyType.Alter,
  ): void {
    if (this.isBankTransactionInFlight()) {
      alertSystem('Aguarde a conclusão da transação bancária anterior.');
      return;
    }

    const input = this.root?.querySelector<HTMLInputElement>(
      `[data-currency-input="${currency}"]`,
    );
    const amount = normalizeBankCurrencyAmount(Number(input?.value ?? 0));
    if (amount === null) {
      alertSystem('Informe um valor inteiro positivo.');
      return;
    }

    const result = this.dispatcher.dispatch({ type, payload: { currency, amount } });
    if (!result.ok) {
      alertSystem(result.reason);
      return;
    }
    if (input) input.value = '';
    if (result.status === 'pending') {
      this.setBankControlsDisabled(true);
    }
  }
}
