import { BankCurrencyType } from '../../../../../shared/bank/bankConstants.js';
import { tryCloseReactWorldPanel, tryFocusReactWorldPanel } from '../../../panels/initWorldPanelsBridge.js';
import { useBankPanelState } from '../../../panels/useBankPanelState.js';
import { MovablePanelFrame } from '../MovablePanelFrame.js';
import { BankSlotCell } from './BankSlotCell.js';

type WorldBankPanelProps = {
  zIndex: number;
  focused: boolean;
};

export function WorldBankPanel({ zIndex, focused }: WorldBankPanelProps) {
  const {
    activeTab,
    setActiveTab,
    wallet,
    inventory,
    bankStorage,
    vaultSlice,
    setVaultPage,
    resolvedStaged,
    itemQuantity,
    updateItemQuantity,
    inFlight,
    flowClass,
    bridgeMeta,
    stageItemFromSlot,
    clearStaged,
    confirmDeposit,
    confirmWithdraw,
    voltsInput,
    setVoltsInput,
    alterInput,
    setAlterInput,
    dispatchCurrency,
    showItemTooltip,
    hideTooltip,
    gridColumns,
    gridRows,
  } = useBankPanelState();

  return (
    <MovablePanelFrame
      windowId="bank"
      title="Banco — Banqueiro"
      zIndex={zIndex}
      focused={focused}
      panelClassName="world-panel--bank ui-panel--bank ui-panel--movable"
      panelStyle={{ width: 'min(920px, 98vw)', maxHeight: 'min(720px, 92vh)' }}
      onFocus={() => tryFocusReactWorldPanel('bank')}
      onClose={() => tryCloseReactWorldPanel('bank')}
    >
      <div className="ui-panel__body ui-panel__body--bank">
        <nav className="ui-bank-tabs" aria-label="Abas do banco">
          <button
            type="button"
            className={`ui-bank-tab${activeTab === 'items' ? ' is-active' : ''}`}
            onClick={() => setActiveTab('items')}
          >
            Depósito de Itens
          </button>
          <button
            type="button"
            className={`ui-bank-tab${activeTab === 'currency' ? ' is-active' : ''}`}
            onClick={() => setActiveTab('currency')}
          >
            Depósito de Moedas
          </button>
        </nav>

        {activeTab === 'items' ? (
          <div className={`ui-bank-items-layout ${flowClass}`} data-bank-items-layout>
            <div className="ui-bank-items-flow" aria-hidden="true">
              <span className="ui-bank-items-flow__packet" />
            </div>

            <section className="ui-bank-items-column" aria-label="Inventário">
              <header className="ui-bank-items-column__header">
                <h3 className="ui-bank-items-column__title">Inventário</h3>
                <span className="ui-bank-items-column__meta">
                  {inventory.used} / {inventory.capacity}
                </span>
              </header>
              <div className="ui-bank-items-column__grid-wrap">
                <div
                  className="slot-grid"
                  role="grid"
                  aria-label="Itens no inventário"
                  style={{ '--slot-cols': gridColumns, '--slot-rows': gridRows } as React.CSSProperties}
                >
                  {inventory.slots.map((slot, index) => (
                    <BankSlotCell
                      key={`inv-${index}`}
                      index={index}
                      slot={slot}
                      source="inventory"
                      selected={resolvedStaged?.source === 'inventory' && resolvedStaged.slotIndex === index}
                      disabled={inFlight}
                      onSelect={stageItemFromSlot}
                      onTooltipShow={showItemTooltip}
                      onTooltipHide={hideTooltip}
                    />
                  ))}
                </div>
                <div className="ui-bank-items-column__grid-spacer" aria-hidden="true" />
              </div>
            </section>

            <aside className="ui-bank-bridge" aria-label="Ponte de transferência">
              <header className="ui-bank-bridge__header">
                <h3 className="ui-bank-bridge__title">{bridgeMeta.direction}</h3>
              </header>

              <div
                className={[
                  'ui-bank-bridge__slot slot-item',
                  bridgeMeta.kindClass,
                  resolvedStaged ? 'slot-item--filled is-staged' : 'is-empty',
                ].filter(Boolean).join(' ')}
                aria-live="polite"
                aria-label={
                  resolvedStaged
                    ? `${bridgeMeta.label}, quantidade ${itemQuantity}`
                    : 'Nenhum item na ponte'
                }
                onMouseEnter={resolvedStaged
                  ? (event) => showItemTooltip(event, resolvedStaged.itemId)
                  : undefined}
                onMouseLeave={resolvedStaged ? hideTooltip : undefined}
              >
                {resolvedStaged ? (
                  <>
                    <span className="slot-item__icon" aria-hidden="true">{bridgeMeta.abbrev}</span>
                    {resolvedStaged.maxQuantity > 1 ? (
                      <span className="slot-item__meta slot-item__meta--qty">{itemQuantity}</span>
                    ) : null}
                  </>
                ) : (
                  <span className="ui-bank-bridge__placeholder">—</span>
                )}
              </div>

              <p className="ui-bank-bridge__label">{bridgeMeta.label}</p>

              <label className="ui-market-exchange-label ui-bank-bridge__qty">
                Quantidade
                <input
                  type="number"
                  min={1}
                  step={1}
                  className="ui-market-exchange-input"
                  data-qty-input
                  value={itemQuantity}
                  disabled={!resolvedStaged || inFlight}
                  onChange={(event) => updateItemQuantity(event.target.value)}
                />
              </label>

              <div className="ui-bank-bridge__actions">
                <button
                  type="button"
                  className="ui-market-exchange-btn ui-bank-bridge__confirm"
                  disabled={!resolvedStaged || inFlight}
                  onClick={bridgeMeta.isDeposit ? confirmDeposit : confirmWithdraw}
                >
                  {bridgeMeta.confirmLabel}
                </button>
                <button
                  type="button"
                  className="ui-market-exchange-btn ui-bank-bridge__clear"
                  disabled={!resolvedStaged || inFlight}
                  onClick={clearStaged}
                >
                  Limpar
                </button>
              </div>
            </aside>

            <section className="ui-bank-items-column" aria-label="Cofre">
              <header className="ui-bank-items-column__header">
                <h3 className="ui-bank-items-column__title">Cofre</h3>
                <span className="ui-bank-items-column__meta">
                  {bankStorage.itemsUsed} / {bankStorage.itemCapacity}
                </span>
              </header>
              <div className="ui-bank-items-column__grid-wrap">
                <div
                  className="slot-grid"
                  role="grid"
                  aria-label={`Itens no cofre, página ${vaultSlice.pageIndex + 1} de ${vaultSlice.pageCount}`}
                  style={{ '--slot-cols': gridColumns, '--slot-rows': gridRows } as React.CSSProperties}
                >
                  {vaultSlice.pageSlots.map((slot, localIndex) => {
                    const globalIndex = vaultSlice.globalOffset + localIndex;
                    return (
                      <BankSlotCell
                        key={`vault-${globalIndex}`}
                        index={globalIndex}
                        slot={slot}
                        source="bank"
                        selected={resolvedStaged?.source === 'bank' && resolvedStaged.slotIndex === globalIndex}
                        disabled={inFlight}
                        onSelect={stageItemFromSlot}
                        onTooltipShow={showItemTooltip}
                        onTooltipHide={hideTooltip}
                      />
                    );
                  })}
                </div>
                <BankVaultPagination
                  pageIndex={vaultSlice.pageIndex}
                  pageCount={vaultSlice.pageCount}
                  onPageChange={setVaultPage}
                />
              </div>
            </section>
          </div>
        ) : (
          <div className="ui-bank-currency-layout">
            <BankCurrencyBlock
              title="VOLTS"
              balanceClass="ui-market-balance--volts"
              walletValue={wallet.voltsFormatted}
              bankValue={bankStorage.voltsFormatted}
              inputValue={voltsInput}
              disabled={inFlight}
              onInputChange={setVoltsInput}
              onDeposit={() => dispatchCurrency('DEPOSIT_CURRENCY', BankCurrencyType.Volts, voltsInput)}
              onWithdraw={() => dispatchCurrency('WITHDRAW_CURRENCY', BankCurrencyType.Volts, voltsInput)}
            />
            <BankCurrencyBlock
              title="ALTER COINS"
              balanceClass="ui-market-balance--alter"
              walletValue={wallet.alterFormatted}
              bankValue={bankStorage.alterFormatted}
              inputValue={alterInput}
              disabled={inFlight}
              onInputChange={setAlterInput}
              onDeposit={() => dispatchCurrency('DEPOSIT_CURRENCY', BankCurrencyType.Alter, alterInput)}
              onWithdraw={() => dispatchCurrency('WITHDRAW_CURRENCY', BankCurrencyType.Alter, alterInput)}
            />
          </div>
        )}
      </div>
    </MovablePanelFrame>
  );
}

type BankVaultPaginationProps = {
  readonly pageIndex: number;
  readonly pageCount: number;
  readonly onPageChange: (page: number) => void;
};

function BankVaultPagination({ pageIndex, pageCount, onPageChange }: BankVaultPaginationProps) {
  if (pageCount <= 1) {
    return <div className="ui-bank-vault-pagination ui-bank-vault-pagination--single" aria-hidden="true" />;
  }

  return (
    <nav className="ui-bank-vault-pagination" aria-label="Páginas do cofre">
      <button
        type="button"
        className="ui-bank-vault-pagination__nav"
        aria-label="Página anterior"
        disabled={pageIndex <= 0}
        onClick={() => onPageChange(pageIndex - 1)}
      >
        Anterior
      </button>
      <div className="ui-bank-vault-pagination__tabs" role="tablist">
        {Array.from({ length: pageCount }, (_, page) => (
          <button
            key={page}
            type="button"
            className={`ui-bank-vault-pagination__tab${page === pageIndex ? ' is-active' : ''}`}
            aria-label={`Página ${page + 1}`}
            aria-current={page === pageIndex ? 'page' : undefined}
            onClick={() => onPageChange(page)}
          >
            {page + 1}
          </button>
        ))}
      </div>
      <button
        type="button"
        className="ui-bank-vault-pagination__nav"
        aria-label="Próxima página"
        disabled={pageIndex >= pageCount - 1}
        onClick={() => onPageChange(pageIndex + 1)}
      >
        Próxima
      </button>
    </nav>
  );
}

type BankCurrencyBlockProps = {
  readonly title: string;
  readonly balanceClass: string;
  readonly walletValue: string;
  readonly bankValue: string;
  readonly inputValue: string;
  readonly disabled: boolean;
  readonly onInputChange: (value: string) => void;
  readonly onDeposit: () => void;
  readonly onWithdraw: () => void;
};

function BankCurrencyBlock({
  title,
  balanceClass,
  walletValue,
  bankValue,
  inputValue,
  disabled,
  onInputChange,
  onDeposit,
  onWithdraw,
}: BankCurrencyBlockProps) {
  return (
    <section className="ui-market-exchange ui-bank-currency-block" aria-label={title}>
      <h3 className="ui-market-section-title">{title}</h3>
      <div className="ui-market-balances ui-bank-currency-balances">
        <div className={`ui-market-balance ${balanceClass}`}>
          <span className="ui-market-balance-label">Carteira</span>
          <span className="ui-market-balance-value">{walletValue}</span>
        </div>
        <div className={`ui-market-balance ${balanceClass}`}>
          <span className="ui-market-balance-label">Cofre</span>
          <span className="ui-market-balance-value">{bankValue}</span>
        </div>
      </div>
      <div className="ui-market-exchange-form">
        <label className="ui-market-exchange-label">
          Valor
          <input
            type="number"
            min={1}
            step={1}
            className="ui-market-exchange-input"
            placeholder="0"
            value={inputValue}
            disabled={disabled}
            onChange={(event) => onInputChange(event.target.value)}
          />
        </label>
        <div className="ui-bank-currency-actions">
          <button
            type="button"
            className="ui-market-exchange-btn"
            disabled={disabled}
            onClick={onDeposit}
          >
            Depositar
          </button>
          <button
            type="button"
            className="ui-market-exchange-btn ui-bank-currency-btn--secondary"
            disabled={disabled}
            onClick={onWithdraw}
          >
            Sacar
          </button>
        </div>
      </div>
    </section>
  );
}
