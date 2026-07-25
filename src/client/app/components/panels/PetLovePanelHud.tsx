// @ts-nocheck
import { closeHudWindow } from '../../panels/panelWindowActions.js';
import { usePetLovePanel } from '../../panels/usePetLovePanel.js';
import { HtmlInject } from './HtmlInject.js';
import { MovablePanelShell } from './MovablePanelShell.js';
export function PetLovePanelHud({ focused }) {
    const { bodyHtml, handleClick } = usePetLovePanel(true);
    const header = (<header className="ui-panel__header pet-love-panel__header" data-panel-drag-handle>
      <div className="pet-love-panel__header-main">
        <span className="pet-love-panel__tag">COMPANHEIRO // PET LOVE</span>
        <h2 className="ui-panel__title">Pet Love</h2>
      </div>
      <button type="button" className="ui-panel__close" data-action="close" aria-label="Fechar Pet Love" onClick={() => closeHudWindow('petLove')}>
        ×
      </button>
    </header>);
    return (<MovablePanelShell panelId="petLove" className="ui-panel--pet-love" title="Pet Love" focused={focused} customHeader={header} bodyClassName="ui-panel__body pet-love-panel__body" dynamicLayoutOptions={{
            fitRootSelector: '[data-hud-fit-root]',
            secondarySelector: '[data-hud-fit-secondary]',
        }}>
      <div data-hud-fit-root onClick={handleClick}>
        <HtmlInject html={bodyHtml}/>
      </div>
    </MovablePanelShell>);
}
