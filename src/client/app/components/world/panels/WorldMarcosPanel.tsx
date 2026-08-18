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
    trailOptions,
    pendingBranch,
    setPendingBranch,
    canChooseTrail,
    trailConfirmed,
    trailStatusLine,
    activating,
    progressTick,
    pendingShort,
    pendingFocus,
    runActivateTrail,
    handleTreeClick,
    handleMouseOver,
    handleMouseLeave,
    legendLevels,
    minTrailLevel,
    playerLevel,
  } = useMarcosPanelState();

  return (
    <MovablePanelFrame
      windowId="marcos"
      title="Habilidade Marcos"
      zIndex={zIndex}
      focused={focused}
      panelClassName="world-panel--marcos ui-panel--marcos ui-panel--movable !max-h-[min(640px,94vh)] !h-[min(640px,94vh)] !min-h-[min(560px,88vh)] !w-[min(580px,96vw)]"
      panelStyle={{
        width: 'min(580px, 96vw)',
        height: 'min(640px, 94vh)',
        maxHeight: 'min(640px, 94vh)',
        minHeight: 'min(560px, 88vh)',
      }}
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
        {canChooseTrail ? (
          <section className="marcos-panel__trail-picker" aria-label="Pré-selecionar trilha Marcos">
            <p className="marcos-panel__trail-picker-title">Escolha a trilha</p>
            <p className="marcos-panel__trail-picker-hint">
              Nível {playerLevel} — pode ativar uma das 3 (Agilidade, Defesa ou Crítico).
            </p>
            <div className="marcos-panel__trail-picker-row" role="group">
              {trailOptions.map((option) => {
                const selected = pendingBranch === option.branch;
                return (
                  <button
                    key={option.branch}
                    type="button"
                    className={`marcos-panel__trail-pick${selected ? ' marcos-panel__trail-pick--selected' : ''}`}
                    disabled={!option.canActivate || activating}
                    aria-pressed={selected}
                    onClick={() => setPendingBranch(option.branch)}
                  >
                    <span className="marcos-panel__trail-pick-name">{option.shortLabel}</span>
                    <span className="marcos-panel__trail-pick-focus">
                      {option.branch === 'fluxo'
                        ? 'Agilidade'
                        : option.branch === 'resiliencia'
                          ? 'Defesa'
                          : 'Crítico'}
                    </span>
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              className="marcos-panel__confirm-btn marcos-panel__confirm-btn--yes marcos-panel__trail-activate"
              disabled={!pendingBranch || activating}
              aria-busy={activating}
              onClick={() => { void runActivateTrail(); }}
            >
              {activating
                ? 'Ativando…'
                : pendingShort
                  ? `Ativar trilha ${pendingShort}`
                  : 'Ativar trilha selecionada'}
            </button>
            {pendingShort && pendingFocus ? (
              <p className="marcos-panel__trail-picker-selected">
                Pré-selecionada: <strong>{pendingShort}</strong> — {pendingFocus}
              </p>
            ) : null}
          </section>
        ) : !trailConfirmed ? (
          <section className="marcos-panel__trail-picker marcos-panel__trail-picker--locked">
            <p className="marcos-panel__trail-picker-title">Trilhas bloqueadas</p>
            <p className="marcos-panel__trail-picker-hint">
              Alcance o nível <strong>{minTrailLevel}</strong> (atual: {playerLevel}) para escolher
              Agilidade, Defesa ou Crítico.
            </p>
          </section>
        ) : null}

        <div className="marcos-panel__tree-area">
          <div
            className="marcos-panel__tree-host"
            data-marcos-progress-tick={progressTick}
            onClick={handleTreeClick}
            dangerouslySetInnerHTML={{ __html: gridHtml }}
          />
          <p className="marcos-panel__legend" data-hud-fit-secondary>
            <span className="marcos-legend marcos-legend--active">◆ Ativo (Nvl. sobe com XP)</span>
            <span className="marcos-legend marcos-legend--available">○ Clique para obter o degrau</span>
            <span className="marcos-legend marcos-legend--locked">Bloqueado</span>
            <span className="marcos-legend marcos-legend--gates">
              Degraus 1–5: personagem {legendLevels}
            </span>
          </p>
        </div>

        {trailConfirmed && trailStatusLine ? (
          <footer
            className="marcos-panel__confirm-bar marcos-panel__confirm-bar--success marcos-panel__confirm-bar--status-only"
            role="status"
            aria-live="polite"
          >
            <p className="marcos-panel__status-line">{trailStatusLine}</p>
          </footer>
        ) : null}
      </div>
    </MovablePanelFrame>
  );
}
