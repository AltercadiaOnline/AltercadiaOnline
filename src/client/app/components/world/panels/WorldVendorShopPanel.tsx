import { useCallback, useMemo } from 'react';
import { resolveItemValorBase } from '../../../../../shared/economy/itemValorEconomy.js';
import { resolveNpcPriceSpread } from '../../../../../shared/economy/npcVendorCatalog.js';
import {
  resolveEffectiveNpcBuyUnitPrice,
  resolveEffectiveNpcSellUnitPrice,
  resolveInventoryItemSellQuote,
  resolveNpcPurchaseQuote,
  resolveNpcSellQuote,
} from '../../../../../shared/economy/npcVendorService.js';
import { formatVoltsShort } from '../../../../../shared/economy/premiumCurrency.js';
import { resolveNpcVendorRarityBlockReason } from '../../../../../shared/economy/npcSellRarityPolicy.js';
import { getActionDispatcher } from '../../../../ActionDispatcher.js';
import {
  resolveInventoryItemKindClass,
  resolveInventoryItemLabel,
} from '../../../../ui/inventory/inventoryItemDisplay.js';
import type { InventorySellRow } from '../../../../ui/vendor/inventorySellRows.js';
import type { NpcVendorListing } from '../../../../../shared/economy/npcVendorCatalog.js';
import type { WorldPanelContext } from '../../../store/worldPanelContext.js';
import { tryCloseReactWorldPanel, tryFocusReactWorldPanel } from '../../../panels/initWorldPanelsBridge.js';
import { useActionGatewaySubmit } from '../../../panels/useActionGatewaySubmit.js';
import {
  resolveVendorFromContext,
  useVendorShopPanelState,
} from '../../../panels/useVendorShopPanelState.js';
import { bindItemHoverHandlers } from '../../../../ui/tooltip/itemHoverTooltip.js';
import { hideGameTooltip, showHintTooltip } from '../../../../ui/tooltip/showGameTooltip.js';
import { MovablePanelFrame } from '../MovablePanelFrame.js';
import { ItemSlotIcon } from './ItemSlotIcon.js';

type WorldVendorShopPanelProps = {
  context: WorldPanelContext;
  zIndex: number;
  focused: boolean;
};

function formatMarketValue(value: number | null): string {
  if (value === null) return '—';
  return formatVoltsShort(value);
}

type CatalogTradeHubProps = {
  listing: NpcVendorListing;
  tradeQuantity: number;
  owned: number;
  purchasePending: boolean;
  sellPending: boolean;
  onQuantityChange: (qty: number) => void;
  onPurchase: () => void;
  onSell: () => void;
  onCancel: () => void;
};

function CatalogTradeHub({
  listing,
  tradeQuantity,
  owned,
  purchasePending,
  sellPending,
  onQuantityChange,
  onPurchase,
  onSell,
  onCancel,
}: CatalogTradeHubProps) {
  const label = resolveInventoryItemLabel(listing.itemId);
  const kindClass = resolveInventoryItemKindClass(listing.itemId);
  const buyQuote = resolveNpcPurchaseQuote(listing, tradeQuantity);
  const sellQuote = resolveNpcSellQuote(listing, tradeQuantity);
  const buyUnit = resolveEffectiveNpcBuyUnitPrice(listing.itemId, listing) ?? 0;
  const sellUnit = resolveEffectiveNpcSellUnitPrice(listing.itemId, listing) ?? 0;
  const buyTotal = buyQuote?.totalVolts ?? buyUnit * tradeQuantity;
  const sellTotal = sellQuote?.totalVolts ?? sellUnit * tradeQuantity;
  const spread = resolveNpcPriceSpread(listing);
  const valorBase = resolveItemValorBase(listing.itemId);
  const rarityBlock = resolveNpcVendorRarityBlockReason(listing.itemId);
  const canSell = owned > 0 && !rarityBlock;

  return (
    <div className={`vendor-shop__trade-hub-inner vendor-shop__trade-hub-inner--active ${kindClass}`}>
      <span className="vendor-shop__trade-tag">NODE::COMPRA</span>
      <div
        className="vendor-shop__trade-item"
        {...bindItemHoverHandlers(listing.itemId)}
      >
        <span className="vendor-shop__trade-icon">
          <ItemSlotIcon itemId={listing.itemId} className="slot-item__sprite slot-item__sprite--lg" />
        </span>
        <div className="vendor-shop__trade-meta">
          <p className="vendor-shop__trade-name">{label}</p>
          <p className="vendor-shop__market-value">
            Valor Base:{' '}
            <span>{valorBase !== null ? formatVoltsShort(valorBase) : '—'}</span>
          </p>
          <p className="vendor-shop__market-value">
            Valor de Mercado:{' '}
            <span>{formatMarketValue(listing.marketValueVolts)}</span>
          </p>
          <p className="vendor-shop__trade-spread">Spread NPC: {formatVoltsShort(spread)}</p>
        </div>
      </div>

      <label className="vendor-shop__trade-qty">
        <span className="vendor-shop__trade-qty-label">Quantidade</span>
        <input
          type="number"
          min={1}
          step={1}
          className="vendor-shop__trade-input"
          value={tradeQuantity}
          disabled={purchasePending || sellPending}
          aria-busy={purchasePending || sellPending}
          onChange={(event) => onQuantityChange(Number(event.target.value) || 1)}
        />
      </label>
      <p className="vendor-shop__trade-owned">No inventário: ×{owned}</p>

      <div className="vendor-shop__trade-actions">
        <button
          type="button"
          className="vendor-shop__trade-btn vendor-shop__trade-btn--buy"
          disabled={purchasePending}
          aria-busy={purchasePending}
          onClick={onPurchase}
        >
          {purchasePending
            ? 'Comprando…'
            : <>Comprar por <strong>{formatVoltsShort(buyTotal)}</strong></>}
        </button>
        {rarityBlock && owned > 0 ? (
          <p
            className="vendor-shop__rarity-hint"
            onMouseEnter={(event) => {
              showHintTooltip(label, event.clientX, event.clientY, { lines: [rarityBlock] });
            }}
            onMouseLeave={() => hideGameTooltip()}
          >
            {rarityBlock}
          </p>
        ) : canSell ? (
          <button
            type="button"
            className="vendor-shop__trade-btn vendor-shop__trade-btn--sell"
            disabled={sellPending}
            aria-busy={sellPending}
            onClick={onSell}
          >
            {sellPending
              ? 'Vendendo…'
              : <>Vender por <strong>{formatVoltsShort(sellTotal)}</strong></>}
          </button>
        ) : null}
      </div>

      <button type="button" className="vendor-shop__trade-cancel" onClick={onCancel}>
        Cancelar seleção
      </button>
    </div>
  );
}

function InventoryTradeHub({
  row,
  tradeQuantity,
  sellPending,
  onQuantityChange,
  onSell,
  onCancel,
}: {
  row: InventorySellRow;
  tradeQuantity: number;
  sellPending: boolean;
  onQuantityChange: (qty: number) => void;
  onSell: () => void;
  onCancel: () => void;
}) {
  const kindClass = resolveInventoryItemKindClass(row.itemId);
  const sellQuote = resolveInventoryItemSellQuote(row.itemId, tradeQuantity);
  const sellTotal = sellQuote?.totalVolts ?? row.sellUnitPrice * tradeQuantity;

  return (
    <div className={`vendor-shop__trade-hub-inner vendor-shop__trade-hub-inner--active ${kindClass}`}>
      <span className="vendor-shop__trade-tag">NODE::REVENDA</span>
      <div
        className="vendor-shop__trade-item"
        {...bindItemHoverHandlers(row.itemId)}
      >
        <span className="vendor-shop__trade-icon">
          <ItemSlotIcon itemId={row.itemId} className="slot-item__sprite slot-item__sprite--lg" />
        </span>
        <div className="vendor-shop__trade-meta">
          <p className="vendor-shop__trade-name">{row.label}</p>
          <p className="vendor-shop__market-value">
            Valor Base: <span>{formatVoltsShort(row.valorBase)}</span>
          </p>
          <p className="vendor-shop__trade-spread">Revenda NPC = 50% do valor base</p>
        </div>
      </div>

      <label className="vendor-shop__trade-qty">
        <span className="vendor-shop__trade-qty-label">Quantidade</span>
        <input
          type="number"
          min={1}
          max={row.quantity}
          step={1}
          className="vendor-shop__trade-input"
          value={tradeQuantity}
          disabled={sellPending}
          aria-busy={sellPending}
          onChange={(event) => onQuantityChange(Number(event.target.value) || 1)}
        />
      </label>
      <p className="vendor-shop__trade-owned">No inventário: ×{row.quantity}</p>

      <div className="vendor-shop__trade-actions">
        <button
          type="button"
          className="vendor-shop__trade-btn vendor-shop__trade-btn--sell"
          disabled={sellPending || tradeQuantity < 1 || tradeQuantity > row.quantity}
          aria-busy={sellPending}
          onClick={onSell}
        >
          {sellPending
            ? 'Vendendo…'
            : <>Vender por <strong>{formatVoltsShort(sellTotal)}</strong></>}
        </button>
      </div>

      <button type="button" className="vendor-shop__trade-cancel" onClick={onCancel}>
        Cancelar seleção
      </button>
    </div>
  );
}

export function WorldVendorShopPanel({ context, zIndex, focused }: WorldVendorShopPanelProps) {
  const vendor = useMemo(() => resolveVendorFromContext(context), [context]);
  const state = useVendorShopPanelState(vendor);

  const handlePurchase = useCallback(() => {
    if (!state.selectedItemId || state.tradeMode !== 'catalog') return undefined;
    return getActionDispatcher().dispatch({
      type: 'PURCHASE_NPC_ITEM',
      payload: {
        vendorId: vendor.vendorId,
        itemId: state.selectedItemId,
        quantity: state.tradeQuantity,
      },
    });
  }, [state.selectedItemId, state.tradeMode, state.tradeQuantity, vendor.vendorId]);

  const handleSell = useCallback(() => {
    if (!state.selectedItemId || state.tradeMode !== 'inventory') return undefined;
    return getActionDispatcher().dispatch({
      type: 'SELL_NPC_ITEM',
      payload: {
        vendorId: vendor.vendorId,
        itemId: state.selectedItemId,
        quantity: state.tradeQuantity,
      },
    });
  }, [state.selectedItemId, state.tradeMode, state.tradeQuantity, vendor.vendorId]);

  const purchaseGateway = useActionGatewaySubmit({
    onClick: handlePurchase,
    onResolved: state.resetAfterPurchase,
  });

  const sellGateway = useActionGatewaySubmit({
    onClick: handleSell,
    onResolved: state.resetAfterSell,
  });

  return (
    <MovablePanelFrame
      windowId="vendorShop"
      title={vendor.vendorName}
      zIndex={zIndex}
      focused={focused}
      panelClassName="world-panel--vendor-shop ui-panel--vendor-shop"
      panelStyle={{ width: 'min(720px, 98vw)' }}
      onFocus={() => tryFocusReactWorldPanel('vendorShop')}
      onClose={() => tryCloseReactWorldPanel('vendorShop')}
    >
      <div className="vendor-shop">
        <p className="vendor-shop__tag">LOJA NPC // SUPRIMENTOS</p>
        <p className="vendor-shop__balance">
          Saldo: <strong>{state.gold.voltsFormatted}</strong>
        </p>
        <p className="vendor-shop__hint">
          Revenda: só <strong>drops/materiais</strong> Comum e Incomum (escamas, ossos, etc.) —
          50% do valor base. Set, poções e Raros+ vão ao <strong>Marketplace</strong>.
        </p>

        <div className="vendor-shop__layout">
          <div className="vendor-shop__lists">
            <section className="vendor-shop__list-wrap" aria-label="Comprar suprimentos">
              <h3 className="vendor-shop__section-title">Comprar</h3>
              <div className="vendor-shop__list-head" aria-hidden="true">
                <span className="vendor-shop__col vendor-shop__col--item">Item</span>
                <span className="vendor-shop__col vendor-shop__col--buy">Preço Venda</span>
                <span className="vendor-shop__col vendor-shop__col--sell">Preço Revenda</span>
              </div>
              <ul className="vendor-shop__list">
                {state.listings.length === 0 ? (
                  <li className="ui-empty">Este vendedor não tem itens no momento.</li>
                ) : (
                  state.listings.map((listing) => {
                    const selected = state.tradeMode === 'catalog'
                      && state.selectedItemId === listing.itemId;
                    const kindClass = resolveInventoryItemKindClass(listing.itemId);
                    const label = resolveInventoryItemLabel(listing.itemId);
                    const buyUnit = resolveEffectiveNpcBuyUnitPrice(listing.itemId, listing) ?? 0;
                    const sellUnit = resolveEffectiveNpcSellUnitPrice(listing.itemId, listing) ?? 0;

                    return (
                      <li key={listing.itemId}>
                        <button
                          type="button"
                          className={[
                            'vendor-shop__row',
                            kindClass,
                            selected ? 'is-selected' : '',
                          ].filter(Boolean).join(' ')}
                          aria-pressed={selected}
                          onClick={() => state.selectCatalogItem(listing.itemId)}
                          {...bindItemHoverHandlers(listing.itemId)}
                        >
                          <span className="vendor-shop__col vendor-shop__col--item">
                            <span className="vendor-shop__icon" aria-hidden="true">
                              <ItemSlotIcon itemId={listing.itemId} />
                            </span>
                            <span className="vendor-shop__item-text">
                              <span className="vendor-shop__name">{label}</span>
                              <span className="vendor-shop__market-value vendor-shop__market-value--inline">
                                Valor de Mercado: {formatMarketValue(listing.marketValueVolts)}
                              </span>
                            </span>
                          </span>
                          <span className="vendor-shop__col vendor-shop__col--buy">
                            <span className="vendor-shop__price vendor-shop__price--buy">
                              {formatVoltsShort(buyUnit)}
                            </span>
                          </span>
                          <span className="vendor-shop__col vendor-shop__col--sell">
                            <span className="vendor-shop__price vendor-shop__price--sell">
                              {formatVoltsShort(sellUnit)}
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })
                )}
              </ul>
            </section>

            <section
              className="vendor-shop__list-wrap vendor-shop__list-wrap--inventory"
              aria-label="Revender drops do inventário"
            >
              <h3 className="vendor-shop__section-title">Revender drops</h3>
              <div className="vendor-shop__list-head vendor-shop__list-head--inventory" aria-hidden="true">
                <span className="vendor-shop__col vendor-shop__col--item">Item</span>
                <span className="vendor-shop__col vendor-shop__col--base">Valor Base</span>
                <span className="vendor-shop__col vendor-shop__col--sell">Preço Revenda</span>
              </div>
              <ul className="vendor-shop__list">
                {state.inventoryRows.length === 0 ? (
                  <li className="ui-empty">
                    Nenhum drop revendável. Só materiais Comum/Incomum (ex.: escamas).
                  </li>
                ) : (
                  state.inventoryRows.map((row) => {
                    const selected = state.tradeMode === 'inventory'
                      && state.selectedItemId === row.itemId;
                    const kindClass = resolveInventoryItemKindClass(row.itemId);

                    return (
                      <li key={row.itemId}>
                        <button
                          type="button"
                          className={[
                            'vendor-shop__row',
                            'vendor-shop__row--inventory',
                            kindClass,
                            selected ? 'is-selected' : '',
                          ].filter(Boolean).join(' ')}
                          aria-pressed={selected}
                          onClick={() => state.selectInventoryItem(row.itemId)}
                          {...bindItemHoverHandlers(row.itemId)}
                        >
                          <span className="vendor-shop__col vendor-shop__col--item">
                            <span className="vendor-shop__icon" aria-hidden="true">
                              <ItemSlotIcon itemId={row.itemId} />
                            </span>
                            <span className="vendor-shop__item-text">
                              <span className="vendor-shop__name">{row.label}</span>
                              <span className="vendor-shop__market-value vendor-shop__market-value--inline">
                                ×{row.quantity} no inventário
                              </span>
                            </span>
                          </span>
                          <span className="vendor-shop__col vendor-shop__col--base">
                            <span className="vendor-shop__price vendor-shop__price--base">
                              {formatVoltsShort(row.valorBase)}
                            </span>
                          </span>
                          <span className="vendor-shop__col vendor-shop__col--sell">
                            <span className="vendor-shop__price vendor-shop__price--sell">
                              {formatVoltsShort(row.sellUnitPrice)}
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })
                )}
              </ul>
            </section>
          </div>

          <aside className="vendor-shop__trade-hub" aria-label="Negociação">
            {state.selectedListing ? (
              <CatalogTradeHub
                listing={state.selectedListing}
                tradeQuantity={state.tradeQuantity}
                owned={state.countInventoryItem(state.selectedListing.itemId)}
                purchasePending={purchaseGateway.pending}
                sellPending={sellGateway.pending}
                onQuantityChange={state.setClampedTradeQuantity}
                onPurchase={purchaseGateway.submit}
                onSell={sellGateway.submit}
                onCancel={state.cancelSelection}
              />
            ) : state.selectedInventoryRow ? (
              <InventoryTradeHub
                row={state.selectedInventoryRow}
                tradeQuantity={state.tradeQuantity}
                sellPending={sellGateway.pending}
                onQuantityChange={state.setClampedTradeQuantity}
                onSell={sellGateway.submit}
                onCancel={state.cancelSelection}
              />
            ) : (
              <div className="vendor-shop__trade-hub-inner vendor-shop__trade-hub-inner--idle">
                <span className="vendor-shop__trade-tag">NODE::IDLE</span>
                <p className="vendor-shop__trade-idle">
                  Selecione um drop na lista e confirme a venda aqui.
                </p>
              </div>
            )}
          </aside>
        </div>
      </div>
    </MovablePanelFrame>
  );
}
