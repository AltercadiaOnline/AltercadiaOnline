import { renderMemorialBook } from '../../../../ui/pet/memorialBookView.js';
import { usePetMemorialPanelState } from '../../../panels/usePetMemorialPanelState.js';
import { MovablePanelFrame } from '../MovablePanelFrame.js';
import { tryCloseReactWorldPanel, tryFocusReactWorldPanel } from '../../../panels/initWorldPanelsBridge.js';

type WorldPetMemorialPanelProps = {
  zIndex: number;
  focused: boolean;
};

export function WorldPetMemorialPanel({ zIndex, focused }: WorldPetMemorialPanelProps) {
  const snapshot = usePetMemorialPanelState();

  return (
    <MovablePanelFrame
      windowId="petMemorial"
      title="Livro de Memórias"
      zIndex={zIndex}
      focused={focused}
      panelClassName="ui-panel--pet-memorial"
      panelStyle={{ width: 'min(420px, 92vw)', maxHeight: 'min(520px, 88vh)' }}
      onFocus={() => tryFocusReactWorldPanel('petMemorial')}
      onClose={() => tryCloseReactWorldPanel('petMemorial')}
    >
      <div
        className="memorial-book-panel__scroll text-[12px] text-white/80"
        dangerouslySetInnerHTML={{ __html: renderMemorialBook(snapshot) }}
      />
    </MovablePanelFrame>
  );
}
