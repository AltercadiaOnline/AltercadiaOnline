import { renderDiaryBook } from '../../../../ui/diary/diaryBookView.js';
import { useDiaryPanelState } from '../../../panels/useDiaryPanelState.js';
import { MovablePanelFrame } from '../MovablePanelFrame.js';
import { tryCloseReactWorldPanel, tryFocusReactWorldPanel } from '../../../panels/initWorldPanelsBridge.js';

type WorldDiaryPanelProps = {
  zIndex: number;
  focused: boolean;
};

export function WorldDiaryPanel({ zIndex, focused }: WorldDiaryPanelProps) {
  const snapshot = useDiaryPanelState();

  return (
    <MovablePanelFrame
      windowId="diary"
      title="Diário de Memórias"
      zIndex={zIndex}
      focused={focused}
      panelClassName="ui-panel--diary"
      panelStyle={{ width: 'min(400px, 92vw)', maxHeight: 'min(520px, 88vh)' }}
      onFocus={() => tryFocusReactWorldPanel('diary')}
      onClose={() => tryCloseReactWorldPanel('diary')}
    >
      <div
        className="diary-panel__scroll text-[12px] text-white/80"
        dangerouslySetInnerHTML={{ __html: renderDiaryBook(snapshot) }}
      />
    </MovablePanelFrame>
  );
}
