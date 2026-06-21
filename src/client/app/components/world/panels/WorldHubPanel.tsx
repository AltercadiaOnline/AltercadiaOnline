import { HUB_PANEL_ACTIONS } from '../../../../ui/hub/hubPanelConfig.js';
import { uiEvents, UIEventType } from '../../../../ui/uiEvents.js';
import { tryCloseReactWorldPanel } from '../../../panels/initWorldPanelsBridge.js';
import { MovablePanelFrame } from '../MovablePanelFrame.js';

type WorldHubPanelProps = {
  zIndex: number;
  focused: boolean;
  onFocus: () => void;
};

export function WorldHubPanel({ zIndex, focused, onFocus }: WorldHubPanelProps) {
  return (
    <MovablePanelFrame
      windowId="hub"
      title="Central Hub"
      zIndex={zIndex}
      focused={focused}
      onFocus={onFocus}
      onClose={() => {
        tryCloseReactWorldPanel('hub');
      }}
    >
      <div className="grid grid-cols-2 gap-2">
        {HUB_PANEL_ACTIONS.map((action) => (
          <button
            key={action.windowId}
            type="button"
            className={[
              'rounded border px-2 py-2 text-[10px] uppercase tracking-[0.12em]',
              action.accent
                ? 'border-alter-accent/50 text-alter-accent hover:bg-alter-accent/10'
                : 'border-white/15 text-white/75 hover:border-white/30',
            ].join(' ')}
            onClick={() => {
              uiEvents.emit(UIEventType.OPEN_WINDOW, { windowId: action.windowId });
            }}
          >
            {action.label}
          </button>
        ))}
      </div>
    </MovablePanelFrame>
  );
}
