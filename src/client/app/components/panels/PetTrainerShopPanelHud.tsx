// @ts-nocheck
import { closeHudWindow } from '../../panels/panelWindowActions.js';
import { usePetTrainerShopPanel } from '../../panels/usePetTrainerShopPanel.js';
import { HtmlInject } from './HtmlInject.js';
import { MovablePanelShell } from './MovablePanelShell.js';
export function PetTrainerShopPanelHud({ focused }) {
    const { vendor, bodyHtml, bodyClassName, bodyRef, handleClick, handleInput, } = usePetTrainerShopPanel(true);
    const header = (<header className="ui-panel__header pet-trainer-shop__header" data-panel-drag-handle>
      <div className="pet-trainer-shop__header-main">
        <span className="pet-trainer-shop__tag">COMPANHEIROS // DIMENSIONAIS</span>
        <h2 className="ui-panel__title pet-trainer-shop__title">{vendor.vendorName}</h2>
      </div>
      <button type="button" className="ui-panel__close" data-action="close" aria-label="Fechar loja de pets" onClick={() => closeHudWindow('petTrainerShop')}>
        ×
      </button>
    </header>);
    return (<MovablePanelShell panelId="petTrainerShop" className="ui-panel--pet-trainer-shop" title={vendor.vendorName} focused={focused} customHeader={header} bodyClassName={`ui-panel__body ${bodyClassName}`}>
      <div ref={bodyRef} onClick={handleClick} onInput={handleInput}>
        <HtmlInject html={bodyHtml}/>
      </div>
    </MovablePanelShell>);
}
