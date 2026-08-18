import { HUB_PANEL_ACTIONS } from '../../../../ui/hub/hubPanelConfig.js';
import { HUD_WINDOW_SHORTCUT_LABEL } from '../../../../ui/keyboardShortcuts.js';
import { windowManager } from '../../../panels/worldWindowController.js';
import { tryCloseReactWorldPanel } from '../../../panels/initWorldPanelsBridge.js';
import { StaticNetworkHubBody } from '../hub/StaticNetworkHubBody.js';

type WorldHubPanelProps = {
  zIndex: number;
  focused: boolean;
  onFocus: () => void;
};

export function WorldHubPanel({ zIndex, focused, onFocus }: WorldHubPanelProps) {
  return (
    <section
      id="world-hub-panel"
      className={`ui-panel ui-panel--hub ui-panel--hub-bar ui-panel--hub-expanded ui-panel--open ui-skin-hybrid ui-skin-hybrid--holo-boost pointer-events-auto${
        focused ? ' ui-skin-hybrid--focused' : ''
      }`}
      style={{ zIndex }}
      role="dialog"
      aria-modal="false"
      aria-label="Hub Central"
      data-world-panel="hub"
      onMouseDown={onFocus}
    >
      <div className="ui-panel__body hub-shell">
        <footer className="ui-hub-bar" data-hub-main-view aria-label="Hub Central">
          <div className="ui-hub-bar__toolbar">
            <div className="ui-hub-bar__heading">
              <span className="ui-hub-bar__tag">LINK // SOCIAL</span>
              <span className="ui-hub-bar__title">HUB SOCIAL</span>
            </div>
            <button
              type="button"
              className="ui-hub-bar__close"
              data-action="close"
              aria-label="Fechar Hub"
              onClick={() => tryCloseReactWorldPanel('hub')}
            >
              ×
            </button>
          </div>
          <nav className="ui-hub-bar__grid" aria-label="Menu rápido">
            {HUB_PANEL_ACTIONS.map((action) => {
              const shortcut = HUD_WINDOW_SHORTCUT_LABEL[action.windowId];
              return (
                <button
                  key={action.windowId}
                  type="button"
                  className={`ui-hub-bar__btn${action.accent ? ' ui-hub-bar__btn--accent' : ''}`}
                  data-open-window={action.windowId}
                  aria-label={shortcut ? `${action.label} (atalho ${shortcut})` : action.label}
                  onClick={() => windowManager.open(action.windowId)}
                >
                  <span className="ui-hub-bar__btn-label">{action.label}</span>
                  {shortcut ? (
                    <span className="ui-hub-bar__btn-key" aria-hidden="true">
                      {' '}
                      [
                      {shortcut}
                      ]
                    </span>
                  ) : null}
                </button>
              );
            })}
          </nav>
        </footer>
        <StaticNetworkHubBody />
      </div>
    </section>
  );
}
