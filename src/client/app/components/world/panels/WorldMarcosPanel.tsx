import { tryCloseReactWorldPanel, tryFocusReactWorldPanel } from '../../../panels/initWorldPanelsBridge.js';
import { useMarcosPanelState } from '../../../panels/useMarcosPanelState.js';
import { MovablePanelFrame } from '../MovablePanelFrame.js';

type WorldMarcosPanelProps = {
  zIndex: number;
  focused: boolean;
};

export function WorldMarcosPanel({ zIndex, focused }: WorldMarcosPanelProps) {
  const {
    gridHtml,
    confirmHtml,
    progressTick,
    handleClick,
    handleMouseOver,
    handleMouseLeave,
    legendLevels,
  } = useMarcosPanelState();

  return (
    <MovablePanelFrame
      windowId="marcos"
      title="Habilidade Marcos"
      zIndex={zIndex}
      focused={focused}
      panelClassName="world-panel--marcos ui-panel--marcos ui-panel--movable"
      panelStyle={{ width: 'min(640px, 98vw)', maxHeight: 'min(720px, 92vh)' }}
      onFocus={() => tryFocusReactWorldPanel('marcos')}
      onClose={() => tryCloseReactWorldPanel('marcos')}
    >
      <div
        className="ui-panel__body marcos-panel__body"
        data-hud-fit-root
        onClick={handleClick}
        onMouseOver={handleMouseOver}
        onMouseLeave={handleMouseLeave}
      >
        <div className="marcos-panel__tree-area">
          <div
            className="marcos-panel__tree-host"
            data-marcos-progress-tick={progressTick}
            dangerouslySetInnerHTML={{ __html: gridHtml }}
          />
          <p className="marcos-panel__legend" data-hud-fit-secondary>
            <span className="marcos-legend marcos-legend--active">◆ Ativo</span>
            <span className="marcos-legend marcos-legend--available">○ Disponível</span>
            <span className="marcos-legend marcos-legend--locked">🔒 Bloqueado</span>
            <span className="marcos-legend marcos-legend--gates">
              Nv. habilidade 1–5: personagem {legendLevels}
            </span>
          </p>
        </div>
        {confirmHtml ? (
          <div dangerouslySetInnerHTML={{ __html: confirmHtml }} />
        ) : null}
      </div>
    </MovablePanelFrame>
  );
}
