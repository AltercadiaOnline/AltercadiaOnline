import { useCallback, useMemo } from 'react';
import { resolveEffectiveNpcBuyUnitPrice, resolveNpcPurchaseQuote } from '../../../../../shared/economy/npcVendorService.js';
import { formatVoltsShort } from '../../../../../shared/economy/premiumCurrency.js';
import type { LabShopTabId } from '../../../../../shared/economy/npcVendorCatalog.js';
import { getActionDispatcher } from '../../../../ActionDispatcher.js';
import {
  resolveInventoryItemAbbrev,
  resolveInventoryItemKindClass,
  resolveInventoryItemLabel,
} from '../../../../ui/inventory/inventoryItemDisplay.js';
import {
  buildConsumableShopEffectLines,
  resolveConsumableShopSubtitle,
} from '../../../../ui/vendor/consumableShopDisplay.js';
import { resolveLabQuantityPresets } from '../../../../ui/vendor/labPurchaseHelpers.js';
import type { WorldPanelContext } from '../../../store/worldPanelContext.js';
import { tryCloseReactWorldPanel, tryFocusReactWorldPanel } from '../../../panels/initWorldPanelsBridge.js';
import { useActionGatewaySubmit } from '../../../panels/useActionGatewaySubmit.js';
import {
  resolveLaboratoryFromContext,
  useLaboratoryShopPanelState,
} from '../../../panels/useLaboratoryShopPanelState.js';
import { MovablePanelFrame } from '../MovablePanelFrame.js';

type WorldLaboratoryShopPanelProps = {
  context: WorldPanelContext;
  zIndex: number;
  focused: boolean;
};

export function WorldLaboratoryShopPanel({
  context,
  zIndex,
  focused,
}: WorldLaboratoryShopPanelProps) {
  const vendor = useMemo(() => resolveLaboratoryFromContext(context), [context]);
  const state = useLaboratoryShopPanelState(vendor);

  const handlePurchase = useCallback(() => {
    if (!state.selectedListing) return undefined;
    return getActionDispatcher().dispatch({
      type: 'PURCHASE_NPC_ITEM',
      payload: {
        vendorId: vendor.vendorId,
        itemId: state.selectedListing.itemId,
        quantity: state.purchaseQuantity,
      },
    });
  }, [state.purchaseQuantity, state.selectedListing, vendor.vendorId]);

  const purchaseGateway = useActionGatewaySubmit({
    onClick: handlePurchase,
    onResolved: state.resetAfterPurchase,
    pendingLabel: 'Comprando…',
    idleLabel: 'Comprar',
  });

  const listing = state.selectedListing;
  const buyUnit = listing
    ? (resolveEffectiveNpcBuyUnitPrice(listing.itemId, listing) ?? 0)
    : 0;
  const quote = listing ? resolveNpcPurchaseQuote(listing, state.purchaseQuantity) : null;
  const total = quote?.totalVolts ?? buyUnit * state.purchaseQuantity;
  const presets = resolveLabQuantityPresets(state.maxPurchaseQuantity);
  const canAfford = state.gold.dollarVolt >= total;
  const canBuy = state.maxPurchaseQuantity >= 1 && canAfford;

  return (
    <MovablePanelFrame
      windowId="laboratoryShop"
      title={vendor.vendorName}
      zIndex={zIndex}
      focused={focused}
      panelClassName="world-panel--laboratory-shop ui-panel--laboratory-shop"
      panelStyle={{ width: 'min(640px, 96vw)' }}
      onFocus={() => tryFocusReactWorldPanel('laboratoryShop')}
      onClose={() => tryCloseReactWorldPanel('laboratoryShop')}
    >
      <div className="laboratory-shop">
        <p className="laboratory-shop__tag">LABORATÓRIO // CONSUMÍVEIS</p>
        <p className="laboratory-shop__balance">
          Saldo: <strong>{state.gold.voltsFormatted}</strong>
        </p>
        <p className="laboratory-shop__hint">
          Prepare-se antes da jornada — poções, runas e livros vão direto ao inventário e ao combate.
        </p>

        <nav className="laboratory-shop__tabs" aria-label="Categorias do laboratório">
          {state.tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`laboratory-shop__tab${state.activeTab === tab.id ? ' is-active' : ''}`}
              aria-pressed={state.activeTab === tab.id}
              onClick={() => state.selectTab(tab.id as LabShopTabId)}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="laboratory-shop__layout">
          <section className="laboratory-shop__catalog" aria-label="Catálogo">
            <div className="laboratory-shop__list-head" aria-hidden="true">
              <span className="laboratory-shop__col laboratory-shop__col--item">Item</span>
              <span className="laboratory-shop__col laboratory-shop__col--price">Preço</span>
            </div>
            <ul className="laboratory-shop__list">
              {state.listings.length === 0 ? (
                <li className="ui-empty">Nenhum item nesta categoria.</li>
              ) : (
                state.listings.map((item) => {
                  const selected = listing?.itemId === item.itemId;
                  const kindClass = resolveInventoryItemKindClass(item.itemId);
                  const label = resolveInventoryItemLabel(item.itemId);
                  const abbrev = resolveInventoryItemAbbrev(item.itemId);
                  const subtitle = resolveConsumableShopSubtitle(item.itemId);
                  const unit = resolveEffectiveNpcBuyUnitPrice(item.itemId, item) ?? 0;

                  return (
                    <li key={item.itemId}>
                      <button
                        type="button"
                        className={[
                          'laboratory-shop__row',
                          kindClass,
                          selected ? ' is-selected' : '',
                        ].join('')}
                        aria-pressed={selected}
                        onClick={() => state.selectItem(item.itemId)}
                      >
                        <span className="laboratory-shop__col laboratory-shop__col--item">
                          <span className="laboratory-shop__icon" aria-hidden="true">{abbrev}</span>
                          <span className="laboratory-shop__item-text">
                            <span className="laboratory-shop__name">{label}</span>
                            {subtitle ? (
                              <span className="laboratory-shop__row-sub">{subtitle}</span>
                            ) : null}
                          </span>
                        </span>
                        <span className="laboratory-shop__col laboratory-shop__col--price">
                          <span className="laboratory-shop__price">{formatVoltsShort(unit)}</span>
                        </span>
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          </section>

          <aside className="laboratory-shop__detail" aria-label="Detalhes e compra">
            {listing ? (
              <div
                className={`laboratory-shop__detail-inner laboratory-shop__detail-inner--active ${resolveInventoryItemKindClass(listing.itemId)}`}
              >
                <span className="laboratory-shop__detail-tag">
                  PREPARO::{state.activeTab.toUpperCase()}
                </span>
                <div className="laboratory-shop__item-head">
                  <span className="laboratory-shop__item-icon">
                    {resolveInventoryItemAbbrev(listing.itemId)}
                  </span>
                  <div className="laboratory-shop__item-meta">
                    <p className="laboratory-shop__item-name">
                      {resolveInventoryItemLabel(listing.itemId)}
                    </p>
                    {resolveConsumableShopSubtitle(listing.itemId) ? (
                      <p className="laboratory-shop__item-sub">
                        {resolveConsumableShopSubtitle(listing.itemId)}
                      </p>
                    ) : null}
                    <p className="laboratory-shop__item-owned">
                      No inventário: ×{state.countInventoryItem(listing.itemId)}
                    </p>
                  </div>
                </div>

                <div className="laboratory-shop__effects" aria-label="Efeitos">
                  <h4 className="laboratory-shop__effects-title">Efeitos</h4>
                  <ul className="laboratory-shop__effects-list">
                    {buildConsumableShopEffectLines(listing.itemId).map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </div>

                <div className="laboratory-shop__purchase">
                  <p className="laboratory-shop__unit-price">
                    Preço unitário: <strong>{formatVoltsShort(buyUnit)}</strong>
                  </p>

                  {presets.length > 1 ? (
                    <div className="laboratory-shop__qty-presets" aria-label="Quantidade rápida">
                      {presets.map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          className={`laboratory-shop__qty-preset${state.purchaseQuantity === preset ? ' is-active' : ''}`}
                          onClick={() => state.setClampedPurchaseQuantity(preset)}
                        >
                          ×{preset}
                        </button>
                      ))}
                    </div>
                  ) : null}

                  <label className="laboratory-shop__qty">
                    <span className="laboratory-shop__qty-label">Quantidade</span>
                    <input
                      type="range"
                      min={1}
                      max={state.maxPurchaseQuantity}
                      step={1}
                      className="laboratory-shop__qty-slider"
                      value={state.purchaseQuantity}
                      disabled={purchaseGateway.pending}
                      onChange={(event) => {
                        state.setClampedPurchaseQuantity(Number(event.target.value) || 1);
                      }}
                    />
                    <input
                      type="number"
                      min={1}
                      max={state.maxPurchaseQuantity}
                      step={1}
                      className="laboratory-shop__qty-input"
                      value={state.purchaseQuantity}
                      disabled={purchaseGateway.pending}
                      aria-busy={purchaseGateway.pending}
                      onChange={(event) => {
                        state.setClampedPurchaseQuantity(Number(event.target.value) || 1);
                      }}
                    />
                  </label>
                  <p className="laboratory-shop__qty-cap">Máximo: ×{state.maxPurchaseQuantity}</p>

                  <button
                    type="button"
                    className="laboratory-shop__buy-btn"
                    disabled={!canBuy || purchaseGateway.pending}
                    aria-busy={purchaseGateway.pending}
                    onClick={purchaseGateway.submit}
                  >
                    {purchaseGateway.pending ? (
                      'Comprando…'
                    ) : (
                      <>Comprar <strong>{formatVoltsShort(total)}</strong></>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="laboratory-shop__detail-inner laboratory-shop__detail-inner--idle">
                <span className="laboratory-shop__detail-tag">PREPARO::IDLE</span>
                <p className="laboratory-shop__detail-idle">
                  Selecione um consumível para ver efeitos e comprar em pilha.
                </p>
              </div>
            )}
          </aside>
        </div>
      </div>
    </MovablePanelFrame>
  );
}
