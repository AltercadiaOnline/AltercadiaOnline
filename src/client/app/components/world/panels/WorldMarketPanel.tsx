import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { revokeMarketTerminalAccess } from '../../../../../shared/economy/marketAccessGate.js';
import { formatMarketplaceFeePercent } from '../../../../../shared/economy/marketplaceEconomy.js';
import {
  formatMarketVolts,
  getMarketBrowseCategoryLabels,
  resolveMarketAverageLabel,
  resolveMarketOfferDisplayName,
  type MarketOfferRow,
  type MarketOfferSide,
} from '../../../../../shared/economy/marketplaceOrderBook.js';
import { resolveItemLabel } from '../../../../ui/market/marketSellFormHelpers.js';
import { bindItemHoverHandlers } from '../../../../ui/tooltip/itemHoverTooltip.js';
import { tryCloseReactWorldPanel, tryFocusReactWorldPanel } from '../../../panels/initWorldPanelsBridge.js';
import { useMarketPanelState } from '../../../panels/useMarketPanelState.js';
import { useReleaseWorldHudOnPanelClose } from '../../../panels/useReleaseWorldHudOnPanelClose.js';
import { MovablePanelFrame } from '../MovablePanelFrame.js';
import { MarketItemIcon } from './MarketItemIcon.js';

type WorldMarketPanelProps = {
  zIndex: number;
  focused: boolean;
};

function MarketOfferTable({
  rows,
  side,
  onCancel,
  onPurchase,
}: {
  readonly rows: readonly (MarketOfferRow | null)[];
  readonly side: MarketOfferSide;
  readonly onCancel: (offerId: string, offerSide: MarketOfferSide) => void;
  readonly onPurchase?: (offerId: string) => void;
}) {
  return (
    <table className="market-terminal__offer-table">
      <thead>
        <tr>
          <th scope="col">Nome</th>
          <th scope="col">Quantidade</th>
          <th scope="col">Preço Unitário</th>
          <th scope="col">Preço Total</th>
          <th scope="col">Ação</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => {
          if (!row) {
            return (
              <tr
                key={`empty-${side}-${index}`}
                className="market-terminal__offer-row market-terminal__offer-row--empty"
              >
                <td colSpan={5} aria-label={`Linha vazia ${index + 1}`}>—</td>
              </tr>
            );
          }

          const name = resolveMarketOfferDisplayName(row);
          const itemHover = bindItemHoverHandlers(row.itemId);

          return (
            <tr
              key={row.id}
              className={[
                'market-terminal__offer-row',
                row.isOwn ? 'market-terminal__offer-row--own' : '',
              ].filter(Boolean).join(' ')}
              data-offer-side={side}
              data-offer-id={row.id}
              {...itemHover}
            >
              <td className="market-terminal__offer-cell market-terminal__offer-cell--name">{name}</td>
              <td className="market-terminal__offer-cell market-terminal__offer-cell--qty">×{row.quantity}</td>
              <td className="market-terminal__offer-cell market-terminal__offer-cell--unit">
                {formatMarketVolts(row.unitPriceVolts)}
              </td>
              <td className="market-terminal__offer-cell market-terminal__offer-cell--total">
                {formatMarketVolts(row.totalPriceVolts)}
              </td>
              <td className="market-terminal__offer-cell market-terminal__offer-cell--action">
                {row.isOwn ? (
                  <button
                    type="button"
                    className="market-terminal__offer-cancel"
                    data-action="cancel-offer"
                    data-offer-id={row.id}
                    data-offer-side={side}
                    aria-label="Cancelar oferta"
                    onClick={() => onCancel(row.id, side)}
                  >
                    Cancelar
                  </button>
                ) : side === 'sell' && onPurchase ? (
                  <button
                    type="button"
                    className="market-terminal__offer-buy"
                    data-action="purchase-offer"
                    data-offer-id={row.id}
                    aria-label="Comprar oferta"
                    onClick={() => onPurchase(row.id)}
                  >
                    Comprar
                  </button>
                ) : null}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export function WorldMarketPanel({ zIndex, focused }: WorldMarketPanelProps) {
  const itemListRef = useRef<HTMLDivElement>(null);
  const sidebarScrollRef = useRef(0);

  const {
    wallet,
    browseCategory,
    browseSource,
    searchQuery,
    sidebarItems,
    sellRowCount,
    offerForm,
    selectedItemId,
    sellView,
    buyView,
    quantity,
    unitPriceVolts,
    offerTotal,
    maxSellQty,
    submitDisabled,
    selectCategory,
    setBrowseSourceMode,
    updateSearchQuery,
    selectBrowseItem,
    setOfferSide,
    updateQuantity,
    updateUnitPrice,
    setAnonymous,
    cancelOffer,
    purchaseOffer,
    publishOffer,
  } = useMarketPanelState();

  useEffect(() => () => {
    revokeMarketTerminalAccess();
  }, []);
  useReleaseWorldHudOnPanelClose('market');

  useLayoutEffect(() => {
    if (itemListRef.current) {
      itemListRef.current.scrollTop = sidebarScrollRef.current;
    }
  }, [browseCategory, browseSource, searchQuery, sidebarItems]);

  const preserveSidebarScroll = useCallback((action: () => void) => {
    sidebarScrollRef.current = itemListRef.current?.scrollTop ?? 0;
    action();
  }, []);

  const selectedLabel = selectedItemId ? resolveItemLabel(selectedItemId) : '—';
  const sellActive = offerForm.offerSide === 'sell';
  const buyActive = offerForm.offerSide === 'buy';
  const categories = getMarketBrowseCategoryLabels();
  const catalogMode = browseSource === 'catalog';
  const listCount = sidebarItems.length;

  return (
    <MovablePanelFrame
      windowId="market"
      title="Monitor do Mercado"
      zIndex={zIndex}
      focused={focused}
      bodyOverflow="hidden"
      panelClassName="world-panel--market ui-panel ui-panel--market ui-panel--market-terminal ui-panel--movable"
      panelStyle={{
        width: 'min(1040px, 97vw)',
        minWidth: 'min(760px, 94vw)',
        minHeight: 'min(560px, 82vh)',
        maxHeight: 'min(720px, 92vh)',
      }}
      onFocus={() => tryFocusReactWorldPanel('market')}
      onClose={() => tryCloseReactWorldPanel('market')}
    >
      <div className="ui-panel__body market-terminal__body">
        <p className="market-terminal__balance">
          <span className="market-terminal__tag">MERCADO // TERMINAL P2P</span>
          {' '}
          Saldo: <strong data-market-wallet>{wallet.voltsFormatted}</strong>
          <span className="market-terminal__fee">Taxa P2P: {formatMarketplaceFeePercent()}</span>
        </p>

        <div className="market-terminal__workspace">
          <aside className="market-terminal__sidebar" aria-label="Categorias e itens">
            <div className="market-terminal__source-toggle" role="tablist" aria-label="Fonte da lista">
              <button
                type="button"
                role="tab"
                className={`market-terminal__source-btn${catalogMode ? ' is-active' : ''}`}
                aria-selected={catalogMode}
                onClick={() => preserveSidebarScroll(() => setBrowseSourceMode('catalog'))}
              >
                Catálogo ({categories.find((entry) => entry.id === 'all')?.count ?? 0})
              </button>
              <button
                type="button"
                role="tab"
                className={`market-terminal__source-btn${!catalogMode ? ' is-active' : ''}`}
                aria-selected={!catalogMode}
                onClick={() => preserveSidebarScroll(() => setBrowseSourceMode('inventory'))}
              >
                Meu inventário ({sellRowCount})
              </button>
            </div>

            <label className="market-terminal__search">
              <span className="market-terminal__search-label">
                {catalogMode ? 'Buscar no catálogo' : 'Buscar no inventário'}
              </span>
              <input
                type="search"
                className="market-terminal__search-input"
                data-market-search
                value={searchQuery}
                placeholder="Nome do item…"
                autoComplete="off"
                onChange={(event) => {
                  preserveSidebarScroll(() => updateSearchQuery(event.target.value));
                }}
              />
            </label>

            {catalogMode ? (
              <nav className="market-terminal__categories" aria-label="Categorias">
                {categories.map((entry) => {
                  const active = browseCategory === entry.id;
                  return (
                    <button
                      key={entry.id}
                      type="button"
                      className={`market-terminal__category${active ? ' is-active' : ''}`}
                      data-market-category={entry.id}
                      aria-pressed={active}
                      onClick={() => {
                        preserveSidebarScroll(() => selectCategory(entry.id));
                      }}
                    >
                      <span className="market-terminal__category-label">{entry.label}</span>
                      <span className="market-terminal__category-count">{entry.count}</span>
                    </button>
                  );
                })}
              </nav>
            ) : (
              <p className="market-terminal__inventory-hint">
                Itens que você pode vender no P2P. Selecione um para publicar oferta de venda.
              </p>
            )}

            <p className="market-terminal__list-meta" aria-live="polite">
              {listCount} {listCount === 1 ? 'item' : 'itens'}
            </p>

            <div
              ref={itemListRef}
              className="market-terminal__item-list"
              role="listbox"
              aria-label={catalogMode ? 'Catálogo do jogo' : 'Inventário vendável'}
            >
              {sidebarItems.length > 0 ? (
                sidebarItems.map((item) => {
                  const active = selectedItemId === item.itemId;
                  return (
                    <button
                      key={item.itemId}
                      type="button"
                      className={`market-terminal__item${active ? ' is-active' : ''}`}
                      data-market-item={item.itemId}
                      aria-pressed={active}
                      onClick={() => selectBrowseItem(item.itemId)}
                      {...bindItemHoverHandlers(item.itemId)}
                    >
                      <MarketItemIcon itemId={item.itemId} />
                      <span className="market-terminal__item-label">{item.label}</span>
                    </button>
                  );
                })
              ) : (
                <p className="market-terminal__sidebar-empty">
                  {catalogMode
                    ? 'Nenhum item nesta categoria.'
                    : 'Nenhum item vendável no inventário.'}
                </p>
              )}
            </div>
          </aside>

          <div className="market-terminal__center">
            <p className="market-terminal__item-focus">
              Item: <strong>{selectedLabel}</strong>
              {selectedItemId ? (
                <span className="market-terminal__average">
                  {resolveMarketAverageLabel(selectedItemId)}
                </span>
              ) : null}
            </p>

            {selectedItemId && sellView && buyView ? (
              <div className="market-terminal__offers-grid">
                <section
                  className="market-terminal__offers-block market-terminal__offers-block--sell"
                  aria-label="Ofertas de venda"
                >
                  <h3 className="market-terminal__offers-title">Sell Offers</h3>
                  <div className="market-terminal__offers-scroll">
                    <MarketOfferTable
                      rows={sellView.paddedRows}
                      side="sell"
                      onCancel={cancelOffer}
                      onPurchase={purchaseOffer}
                    />
                  </div>
                </section>
                <section
                  className="market-terminal__offers-block market-terminal__offers-block--buy"
                  aria-label="Ofertas de compra"
                >
                  <h3 className="market-terminal__offers-title">Buy Offers</h3>
                  <div className="market-terminal__offers-scroll">
                    <MarketOfferTable
                      rows={buyView.paddedRows}
                      side="buy"
                      onCancel={cancelOffer}
                    />
                  </div>
                </section>
              </div>
            ) : (
              <div className="market-terminal__offers-empty">
                Selecione um item na barra lateral para ver ofertas de venda e compra.
              </div>
            )}
          </div>
        </div>

        <footer className="market-terminal__footer" aria-label="Criar oferta">
          <div className="market-terminal__footer-side">
            <span className="market-terminal__footer-label">Tipo</span>
            <div className="market-terminal__side-toggle" role="group" aria-label="Vender ou comprar">
              <button
                type="button"
                className={`market-terminal__side-btn${sellActive ? ' is-active' : ''}`}
                data-market-side="sell"
                aria-pressed={sellActive}
                onClick={() => setOfferSide('sell')}
              >
                Vender
              </button>
              <button
                type="button"
                className={`market-terminal__side-btn${buyActive ? ' is-active' : ''}`}
                data-market-side="buy"
                aria-pressed={buyActive}
                onClick={() => setOfferSide('buy')}
              >
                Comprar
              </button>
            </div>
          </div>

          <label className="market-terminal__footer-field">
            <span className="market-terminal__footer-label">Quantidade</span>
            <input
              type="number"
              className="market-terminal__footer-input"
              data-market-offer-qty
              min={1}
              max={sellActive && maxSellQty > 0 ? maxSellQty : 9999}
              step={1}
              value={quantity}
              onChange={(event) => updateQuantity(Number(event.target.value) || 1)}
            />
          </label>

          <label className="market-terminal__footer-field">
            <span className="market-terminal__footer-label">Preço por peça</span>
            <input
              type="number"
              className="market-terminal__footer-input"
              data-market-offer-price
              min={1}
              step={1}
              value={unitPriceVolts}
              onChange={(event) => updateUnitPrice(Number(event.target.value) || 1)}
            />
          </label>

          <label className="market-terminal__footer-anon">
            <input
              type="checkbox"
              data-market-offer-anon
              checked={offerForm.anonymous}
              onChange={(event) => setAnonymous(event.target.checked)}
            />
            <span>Anonimato</span>
          </label>

          <div className="market-terminal__footer-submit-wrap">
            <p className="market-terminal__footer-total" data-market-offer-total>
              Total: <strong>{formatMarketVolts(offerTotal)}</strong>
            </p>
            <button
              type="button"
              className="market-terminal__footer-submit"
              data-action="publish-offer"
              disabled={submitDisabled}
              onClick={publishOffer}
            >
              Publicar oferta
            </button>
          </div>
        </footer>
      </div>
    </MovablePanelFrame>
  );
}
