// @ts-nocheck
import { HUB_PANEL_ACTIONS } from '../../../ui/hub/hubPanelConfig.js';
import { HUD_WINDOW_SHORTCUT_LABEL } from '../../../ui/keyboardShortcuts.js';
import { closeHudHub, openHudWindow } from '../../panels/panelWindowActions.js';
export function CentralHubHud() {
    return (<div id="ui-panel-hub" className="ui-panel ui-panel--hub ui-panel--hub-bar ui-panel--open ui-interactive pointer-events-auto" data-ui-panel="hub" role="dialog" aria-label="Hub Social">
      <div className="ui-panel__body hub-shell hub-shell--bar-only">
        <footer className="ui-hub-bar" data-hub-main-view aria-label="Hub Central">
          <div className="ui-hub-bar__toolbar">
            <span className="ui-hub-bar__title">HUB SOCIAL</span>
            <button type="button" className="ui-hub-bar__close" data-action="close" aria-label="Fechar Hub" onClick={() => closeHudHub()}>
              ×
            </button>
          </div>
          <nav className="ui-hub-bar__grid" aria-label="Menu rápido">
            {HUB_PANEL_ACTIONS.map((action) => {
            const shortcut = HUD_WINDOW_SHORTCUT_LABEL[action.windowId];
            const ariaShortcut = shortcut ? ` (atalho ${shortcut})` : '';
            return (<button key={action.windowId} type="button" className={[
                    'ui-hub-bar__btn',
                    action.accent ? 'ui-hub-bar__btn--accent' : '',
                ].filter(Boolean).join(' ')} data-open-window={action.windowId} aria-label={`${action.label}${ariaShortcut}`} onClick={() => openHudWindow(action.windowId)}>
                  <span className="ui-hub-bar__btn-label">{action.label}</span>
                  {shortcut ? (<span className="ui-hub-bar__btn-key" aria-hidden="true">
                      {' '}
                      [
                      {shortcut}
                      ]
                    </span>) : null}
                </button>);
        })}
          </nav>
        </footer>
      </div>
    </div>);
}
