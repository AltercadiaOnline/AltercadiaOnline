// @ts-nocheck
import { closeHudWindow } from '../../panels/panelWindowActions.js';
import { useMarketPanel } from '../../panels/useMarketPanel.js';
import { HtmlInject } from './HtmlInject.js';
import { MovablePanelShell } from './MovablePanelShell.js';
export function MarketPanelHud({ focused }) {
    const { bodyHtml, bodyRef, handleClick, handleInput } = useMarketPanel(true);
    const header = (<header className="ui-panel__header market-terminal__header" data-panel-drag-handle>
      <div className="market-terminal__header-main">
        <span className="market-terminal__tag">MERCADO // TERMINAL P2P</span>
        <h2 className="ui-panel__title market-terminal__title">Monitor do Mercado</h2>
      </div>
      <button type="button" className="ui-panel__close" data-action="close" aria-label="Fechar Monitor do Mercado" onClick={() => closeHudWindow('market')}>
        ×
      </button>
    </header>);
    return (<MovablePanelShell panelId="market" className="ui-panel--market ui-panel--market-terminal" title="Monitor do Mercado" focused={focused} customHeader={header} bodyClassName="ui-panel__body market-terminal__body">
      <div ref={bodyRef} onClick={handleClick} onInput={handleInput}>
        <HtmlInject html={bodyHtml}/>
      </div>
    </MovablePanelShell>);
}
