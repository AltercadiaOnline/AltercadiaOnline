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
    confirmBarMode,
    pendingNode,
    pendingBranchLabel,
    confirmedBranchLabel,
    confirmBranchGateway,
    cancelBranchSelection,
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
      bodyOverflow="hidden"
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

        {confirmBarMode === 'idle' ? (
          <footer className="marcos-panel__confirm-bar marcos-panel__confirm-bar--idle" role="region" aria-label="Escolher trilha Marcos">
            <div className="marcos-panel__confirm-copy">
              <p className="marcos-panel__confirm-title">Escolher trilha</p>
              <p className="marcos-panel__confirm-text">
                Selecione a <strong>primeira instância</strong> de uma trilha (Nv. 10+) e confirme abaixo.
              </p>
            </div>
          </footer>
        ) : null}

        {confirmBarMode === 'pending' && pendingNode && pendingBranchLabel ? (
          <footer className="marcos-panel__confirm-bar" role="region" aria-label="Confirmar trilha Marcos">
            <div className="marcos-panel__confirm-copy">
              <p className="marcos-panel__confirm-title">Confirmar trilha</p>
              <p className="marcos-panel__confirm-text">
                Travar <strong>{pendingBranchLabel}</strong> com{' '}
                <strong>{pendingNode.def.name}</strong>?
              </p>
              <p className="marcos-panel__confirm-hint">
                Após confirmar, as outras trilhas ficam ofuscadas até falar com o Mestre de Trilhas.
              </p>
            </div>
            <div className="marcos-panel__confirm-actions">
              <button
                type="button"
                className="marcos-panel__confirm-btn marcos-panel__confirm-btn--yes"
                disabled={confirmBranchGateway.pending}
                aria-busy={confirmBranchGateway.pending}
                onClick={(event) => {
                  event.stopPropagation();
                  confirmBranchGateway.submit();
                }}
              >
                {confirmBranchGateway.buttonLabel}
              </button>
              <button
                type="button"
                className="marcos-panel__confirm-btn marcos-panel__confirm-btn--no"
                disabled={confirmBranchGateway.pending}
                onClick={(event) => {
                  event.stopPropagation();
                  cancelBranchSelection();
                }}
              >
                Cancelar
              </button>
            </div>
          </footer>
        ) : null}

        {confirmBarMode === 'confirmed' && confirmedBranchLabel ? (
          <footer
            className="marcos-panel__confirm-bar marcos-panel__confirm-bar--success"
            role="status"
            aria-live="polite"
            aria-label="Trilha Marcos confirmada"
          >
            <div className="marcos-panel__confirm-copy">
              <p className="marcos-panel__confirm-title">Trilha confirmada</p>
              <p className="marcos-panel__confirm-text">
                <strong>{confirmedBranchLabel}</strong> está ativa. As outras trilhas ficam ofuscadas.
              </p>
              <p className="marcos-panel__confirm-hint">
                Clique nos próximos nós disponíveis da sua trilha para avançar.
              </p>
            </div>
          </footer>
        ) : null}
      </div>
    </MovablePanelFrame>
  );
}
