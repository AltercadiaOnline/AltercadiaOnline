import { MovablePanelFrame } from '../MovablePanelFrame.js';
import { tryCloseReactWorldPanel, tryFocusReactWorldPanel } from '../../../panels/initWorldPanelsBridge.js';

type WorldSocialPanelProps = {
  zIndex: number;
  focused: boolean;
};

export function WorldSocialPanel({ zIndex, focused }: WorldSocialPanelProps) {
  return (
    <MovablePanelFrame
      windowId="social"
      title="Social"
      zIndex={zIndex}
      focused={focused}
      panelClassName="ui-panel--social"
      panelStyle={{ width: 'min(420px, 92vw)', maxHeight: 'min(480px, 86vh)' }}
      onFocus={() => tryFocusReactWorldPanel('social')}
      onClose={() => tryCloseReactWorldPanel('social')}
    >
      <div className="social-panel__body flex flex-col gap-3">
        <nav className="social-panel__tabs flex gap-2" aria-label="Seções sociais">
          <button type="button" className="social-panel__tab social-panel__tab--active" aria-pressed="true">
            Amigos
          </button>
          <button type="button" className="social-panel__tab opacity-50" disabled>
            Guilda
          </button>
          <button type="button" className="social-panel__tab opacity-50" disabled>
            Chat
          </button>
        </nav>
        <p className="ui-empty social-panel__placeholder text-[12px] text-white/65">
          Rede social em breve.
        </p>
      </div>
    </MovablePanelFrame>
  );
}
