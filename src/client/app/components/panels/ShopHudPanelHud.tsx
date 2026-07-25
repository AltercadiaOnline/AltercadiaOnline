// @ts-nocheck
import { closeHudWindow } from '../../panels/panelWindowActions.js';
import { useShopHudPanel } from '../../panels/useShopHudPanel.js';
import { MovablePanelShell } from './MovablePanelShell.js';
export function ShopHudPanelHud({ focused }) {
    const { view, purchaseSkin } = useShopHudPanel(true);
    const header = (<header className="ui-panel__header shop-hud__header" data-panel-drag-handle>
      <div>
        <span className="shop-hud__tag">MERCADO // SKINS</span>
        <h2 className="ui-panel__title">Loja de Skins</h2>
      </div>
      <button type="button" className="ui-panel__close" data-action="close" aria-label="Fechar loja de skins" onClick={() => closeHudWindow('shop')}>
        ×
      </button>
    </header>);
    return (<MovablePanelShell panelId="shop" className="ui-panel--shop" title="Loja de Skins" focused={focused} customHeader={header} bodyClassName="ui-panel__body shop-hud__body">
      <p className="shop-hud__balance">
        Saldo:
        {' '}
        <strong data-shop-wallet>{view.walletFormatted}</strong>
      </p>
      <p className="shop-hud__hint">Peças cosméticas — não alteram stats de batalha.</p>
      <div className="shop-hud__grid" data-shop-grid>
        {view.items.map((item) => (<article key={`${item.slot}-${item.optionId}`} className={[
                'shop-hud__card',
                item.owned ? 'shop-hud__card--owned' : '',
            ].filter(Boolean).join(' ')}>
            <div className="shop-hud__swatch" style={{ background: item.accent }}/>
            <p className="shop-hud__slot">{item.slotLabel}</p>
            <h3 className="shop-hud__name">{item.name}</h3>
            <p className="shop-hud__price">{item.priceLabel}</p>
            <button type="button" className="shop-hud__buy" data-buy-skin data-skin-slot={item.slot} data-option-id={item.optionId} disabled={item.owned} onClick={() => purchaseSkin(item.slot, item.optionId)}>
              {item.owned ? 'Adquirido' : 'Comprar'}
            </button>
          </article>))}
      </div>
    </MovablePanelShell>);
}
