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
    treeHostRef,
    confirmBarMode,
    confirmedBranchLabel,
    activating,
    progressTick,
    handleMouseOver,
    handleMouseLeave,
    legendLevels,
    minTrailLevel,
  } = useMarcosPanelState();

  return (
    <MovablePanelFrame
      windowId="marcos"
      title="Habilidade Marcos"
      zIndex={zIndex}
      focused={focused}
      panelClassName="world-panel--marcos ui-panel--marcos ui-panel--movable"
      panelStyle={{ width: 'min(700px, 96vw)', maxHeight: 'min(620px, 90vh)' }}
      bodyOverflow="hidden"
      onFocus={() => tryFocusReactWorldPanel('marcos')}
      onClose={() => tryCloseReactWorldPanel('marcos')}
    >
      <div
        className="ui-panel__body marcos-panel__body"
        data-hud-fit-root
        data-marcos-activating={activating ? '1' : '0'}
        onMouseOver={handleMouseOver}
        onMouseLeave={handleMouseLeave}
      >
        <div className="marcos-panel__tree-area">
          <div
            ref={treeHostRef}
            className="marcos-panel__tree-host"
            data-marcos-progress-tick={progressTick}
            dangerouslySetInnerHTML={{ __html: gridHtml }}
          />
          <p className="marcos-panel__legend" data-hud-fit-secondary>
            <span className="marcos-legend marcos-legend--active">◆ Ativo</span>
            <span className="marcos-legend marcos-legend--available">○ Disponível</span>
            <span className="marcos-legend marcos-legend--choice">◇ Iniciar trilha</span>
            <span className="marcos-legend marcos-legend--locked">🔒 Bloqueado</span>
            <span className="marcos-legend marcos-legend--gates">
              Nv. habilidade 1–5: personagem {legendLevels}
            </span>
          </p>
        </div>

        {confirmBarMode === 'confirmed' && confirmedBranchLabel ? (
          <footer
            className="marcos-panel__confirm-bar marcos-panel__confirm-bar--success"
            role="status"
            aria-live="polite"
            aria-label="Trilha Marcos ativa"
          >
            <div className="marcos-panel__confirm-copy">
              <p className="marcos-panel__confirm-title">Trilha ativa</p>
              <p className="marcos-panel__confirm-text">
                <strong>{confirmedBranchLabel}</strong> está ligada. As outras duas ficam ofuscadas.
              </p>
              <p className="marcos-panel__confirm-hint">
                Clique nos próximos nós ○ da sua trilha para avançar. Reset só com o Mestre de Trilhas.
              </p>
            </div>
          </footer>
        ) : confirmBarMode === 'choose' ? (
          <footer
            className="marcos-panel__confirm-bar marcos-panel__confirm-bar--idle"
            role="status"
            aria-live="polite"
            aria-label="Escolher trilha Marcos"
          >
            <div className="marcos-panel__confirm-copy">
              <p className="marcos-panel__confirm-title">
                {activating ? 'Ativando trilha…' : 'Iniciar trilha'}
              </p>
              <p className="marcos-panel__confirm-text">
                Clique em <strong>uma</strong> das 3 habilidades com ◇ (nível {minTrailLevel}+).
                Só uma trilha pode ficar ativa por vez.
              </p>
            </div>
          </footer>
        ) : confirmBarMode === 'locked-level' ? (
          <footer
            className="marcos-panel__confirm-bar marcos-panel__confirm-bar--idle"
            role="status"
            aria-live="polite"
          >
            <div className="marcos-panel__confirm-copy">
              <p className="marcos-panel__confirm-title">Trilhas bloqueadas</p>
              <p className="marcos-panel__confirm-text">
                Alcance o nível <strong>{minTrailLevel}</strong> do personagem para iniciar uma das 3 trilhas.
              </p>
            </div>
          </footer>
        ) : null}
      </div>
    </MovablePanelFrame>
  );
}
