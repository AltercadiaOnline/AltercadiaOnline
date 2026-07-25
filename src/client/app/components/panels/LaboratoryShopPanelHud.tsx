// @ts-nocheck
import { closeHudWindow } from '../../panels/panelWindowActions.js';
import { useLaboratoryShopPanel } from '../../panels/useLaboratoryShopPanel.js';
import { HtmlInject } from './HtmlInject.js';
import { MovablePanelShell } from './MovablePanelShell.js';
export function LaboratoryShopPanelHud({ focused }) {
    const { vendor, bodyHtml, bodyRef, handleClick, handleInput } = useLaboratoryShopPanel(true);
    const header = (<header className="ui-panel__header laboratory-shop__header" data-panel-drag-handle>
      <div className="laboratory-shop__header-main">
        <span className="laboratory-shop__tag">LABORATÓRIO // CONSUMÍVEIS</span>
        <h2 className="ui-panel__title laboratory-shop__title">{vendor.vendorName}</h2>
      </div>
      <button type="button" className="ui-panel__close" data-action="close" aria-label="Fechar laboratório" onClick={() => closeHudWindow('laboratoryShop')}>
        ×
      </button>
    </header>);
    return (<MovablePanelShell panelId="laboratoryShop" className="ui-panel--laboratory-shop" title={vendor.vendorName} focused={focused} customHeader={header} bodyClassName="ui-panel__body laboratory-shop__body">
      <div ref={bodyRef} onClick={handleClick} onInput={handleInput}>
        <HtmlInject html={bodyHtml}/>
      </div>
    </MovablePanelShell>);
}
