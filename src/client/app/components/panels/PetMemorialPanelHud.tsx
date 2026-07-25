// @ts-nocheck
import { closeHudWindow } from '../../panels/panelWindowActions.js';
import { usePetMemorialPanel } from '../../panels/usePetMemorialPanel.js';
import { HtmlInject } from './HtmlInject.js';
import { MovablePanelShell } from './MovablePanelShell.js';
export function PetMemorialPanelHud({ focused }) {
    const { bodyHtml } = usePetMemorialPanel(true);
    const header = (<header className="ui-panel__header memorial-book-panel__header" data-panel-drag-handle>
      <div className="memorial-book-panel__header-main">
        <span className="memorial-book-panel__tag">SISTEMA DE MEMÓRIAS</span>
        <h2 className="ui-panel__title">Livro de Memórias</h2>
      </div>
      <button type="button" className="ui-panel__close" data-action="close" aria-label="Fechar Livro de Memórias" onClick={() => closeHudWindow('petMemorial')}>
        ×
      </button>
    </header>);
    return (<MovablePanelShell panelId="petMemorial" className="ui-panel--pet-memorial" title="Livro de Memórias" focused={focused} customHeader={header} bodyClassName="ui-panel__body memorial-book-panel__body" dynamicLayoutOptions={{
            fitRootSelector: '.memorial-book-panel__scroll',
            secondarySelector: '[data-hud-fit-secondary]',
        }}>
      <div className="memorial-book-panel__scroll">
        <HtmlInject html={bodyHtml}/>
      </div>
    </MovablePanelShell>);
}
