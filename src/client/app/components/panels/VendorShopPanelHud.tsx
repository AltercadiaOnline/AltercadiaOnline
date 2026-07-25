// @ts-nocheck
import { closeHudWindow } from '../../panels/panelWindowActions.js';
import { useVendorShopPanel } from '../../panels/useVendorShopPanel.js';
import { HtmlInject } from './HtmlInject.js';
import { MovablePanelShell } from './MovablePanelShell.js';
export function VendorShopPanelHud({ focused }) {
    const { vendor, bodyHtml, bodyRef, handleClick, handleInput } = useVendorShopPanel(true);
    const header = (<header className="ui-panel__header vendor-shop__header" data-panel-drag-handle>
      <div className="vendor-shop__header-main">
        <span className="vendor-shop__tag">LOJA NPC // SUPRIMENTOS</span>
        <h2 className="ui-panel__title vendor-shop__title">{vendor.vendorName}</h2>
      </div>
      <button type="button" className="ui-panel__close" data-action="close" aria-label="Fechar loja" onClick={() => closeHudWindow('vendorShop')}>
        ×
      </button>
    </header>);
    return (<MovablePanelShell panelId="vendorShop" className="ui-panel--vendor-shop" title={vendor.vendorName} focused={focused} customHeader={header} bodyClassName="ui-panel__body vendor-shop__body" dynamicLayoutOptions={{
            fitRootSelector: '.vendor-shop__body',
            itemSelector: '[data-hud-fit-item]',
            secondarySelector: '[data-hud-fit-secondary]',
            minVisibleItems: 3,
        }}>
      <div ref={bodyRef} data-hud-fit-root onClick={handleClick} onInput={handleInput}>
        <HtmlInject html={bodyHtml}/>
      </div>
    </MovablePanelShell>);
}
