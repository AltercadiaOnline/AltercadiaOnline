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
      title="Contratos"
      titleMeta="// AGENTE //"
      zIndex={zIndex}
      focused={focused}
      bodyOverflow="auto"
      panelClassName="ui-panel--quest ui-panel--quest-hybrid ui-panel--npc-hybrid ui-skin-hybrid"
      panelStyle={{
        width: 'min(360px, 92vw)',
        height: 'auto',
        maxHeight: 'min(380px, 72vh)',
      }}
      onFocus={() => tryFocusReactWorldPanel('quest')}
      onClose={() => tryCloseReactWorldPanel('quest')}
    >
      <div className="quest-contracts-hud">
        <MercenaryQuestBoard />
      </div>
    </MovablePanelFrame>
  );
}
