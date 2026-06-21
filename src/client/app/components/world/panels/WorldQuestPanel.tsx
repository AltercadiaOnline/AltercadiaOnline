import { MovablePanelFrame } from '../MovablePanelFrame.js';
import { tryCloseReactWorldPanel, tryFocusReactWorldPanel } from '../../../panels/initWorldPanelsBridge.js';

type WorldQuestPanelProps = {
  zIndex: number;
  focused: boolean;
};

export function WorldQuestPanel({ zIndex, focused }: WorldQuestPanelProps) {
  return (
    <MovablePanelFrame
      windowId="quest"
      title="Quests"
      zIndex={zIndex}
      focused={focused}
      panelClassName="ui-panel--quest"
      onFocus={() => tryFocusReactWorldPanel('quest')}
      onClose={() => tryCloseReactWorldPanel('quest')}
    >
      <p className="ui-empty text-[12px] text-white/70">Quadro de contratos em breve.</p>
    </MovablePanelFrame>
  );
}
