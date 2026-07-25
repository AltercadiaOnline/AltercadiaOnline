// @ts-nocheck
import { closeHudWindow } from '../../panels/panelWindowActions.js';
import { MovablePanelShell } from './MovablePanelShell.js';
export function SocialPanelHud({ focused }) {
    const header = (<header className="ui-panel__header social-panel__header" data-panel-drag-handle>
      <div className="social-panel__header-main">
        <span className="social-panel__tag">REDE // SOCIAL</span>
        <h2 className="ui-panel__title">Social</h2>
      </div>
      <button type="button" className="ui-panel__close" data-action="close" aria-label="Fechar Social" onClick={() => closeHudWindow('social')}>
        ×
      </button>
    </header>);
    return (<MovablePanelShell panelId="social" className="ui-panel--social" title="Social" focused={focused} customHeader={header} bodyClassName="ui-panel__body social-panel__body" dynamicLayoutOptions={{
            fitRootSelector: '[data-hud-fit-root]',
            secondarySelector: '[data-hud-fit-secondary]',
        }}>
      <div data-hud-fit-root>
        <nav className="social-panel__tabs" aria-label="Seções sociais" data-hud-fit-secondary>
          <button type="button" className="social-panel__tab social-panel__tab--active" aria-pressed>
            Amigos
          </button>
          <button type="button" className="social-panel__tab" disabled>Guilda</button>
          <button type="button" className="social-panel__tab" disabled>Chat</button>
        </nav>
        <div className="social-panel__segment-host">
          <div className="social-panel__segment social-panel__segment--network">
            <p className="ui-empty social-panel__placeholder">Rede social em breve.</p>
          </div>
        </div>
      </div>
    </MovablePanelShell>);
}
