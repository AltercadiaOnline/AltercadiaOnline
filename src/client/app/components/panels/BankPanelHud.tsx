// @ts-nocheck
import { closeHudWindow } from '../../panels/panelWindowActions.js';
import { useBankPanel } from '../../panels/useBankPanel.js';
import { HtmlInject } from './HtmlInject.js';
import { MovablePanelShell } from './MovablePanelShell.js';
export function BankPanelHud({ focused }) {
    const { bodyHtml, bodyRef, handleClick, handleChange } = useBankPanel(true);
    const header = (<header className="ui-panel__header" data-panel-drag-handle>
      <h2 className="ui-panel__title">Banco — Banqueiro</h2>
      <button type="button" className="ui-panel__close" data-action="close" aria-label="Fechar Banco" onClick={() => closeHudWindow('bank')}>
        ×
      </button>
    </header>);
    return (<MovablePanelShell panelId="bank" className="ui-panel--bank" title="Banco — Banqueiro" focused={focused} customHeader={header} bodyClassName="ui-panel__body ui-panel__body--bank">
      <div ref={bodyRef} onClick={handleClick} onChange={handleChange}>
        <HtmlInject html={bodyHtml}/>
      </div>
    </MovablePanelShell>);
}
