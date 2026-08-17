import { MovablePanelFrame } from '../MovablePanelFrame.js';
import { tryCloseReactWorldPanel, tryFocusReactWorldPanel } from '../../../panels/initWorldPanelsBridge.js';
import { MercenaryQuestBoard } from './MercenaryQuestBoard.js';

type WorldQuestPanelProps = {
  zIndex: number;
  focused: boolean;
};

export function WorldQuestPanel({ zIndex, focused }: WorldQuestPanelProps) {
  return (
    <MovablePanelFrame
      windowId="quest"
      title="Quadro de Agente"
      zIndex={zIndex}
      focused={focused}
      panelClassName="ui-panel--quest"
      panelStyle={{ width: 'min(420px, 94vw)', maxHeight: 'min(520px, 88vh)' }}
      onFocus={() => tryFocusReactWorldPanel('quest')}
      onClose={() => tryCloseReactWorldPanel('quest')}
    >
      <MercenaryQuestBoard />
    </MovablePanelFrame>
  );
}
