import { useCallback, useEffect, useState, type MouseEvent } from 'react';
import { ACTIVE_MOVESET_SLOT_COUNT } from '../../../../../shared/combat/moveTypes.js';
import { resolveMoveDefinitionForUi } from '../../../../../shared/combat/movesetLoadout.js';
import { formatCombatClassLabel } from '../../../../../shared/character/combatClassDisplay.js';
import { getGlobalPlayerStore } from '../../../../ui/moveset/globalPlayerStore.js';
import { alertSystem } from '../../../../ui/alertSystem.js';
import { hideMoveTooltip, showMoveTooltipAt } from '../../../../ui/tooltip/showMoveTooltip.js';
import { tryCloseReactWorldPanel, tryFocusReactWorldPanel } from '../../../panels/initWorldPanelsBridge.js';
import { useMovesetPanelState } from '../../../panels/useMovesetPanelState.js';
import { MovablePanelFrame } from '../MovablePanelFrame.js';
import { MovesetMoveProgress } from './MovesetMoveProgress.js';

type WorldMovesetPanelProps = {
  zIndex: number;
  focused: boolean;
};

function showMoveTooltip(event: MouseEvent<HTMLElement>, moveId: string): void {
  const rect = event.currentTarget.getBoundingClientRect();
  showMoveTooltipAt(moveId, rect.left + rect.width / 2, rect.top, 'above');
}

export function WorldMovesetPanel({ zIndex, focused }: WorldMovesetPanelProps) {
  const {
    snapshot,
    classId,
    movesProgression,
    characterLevel,
    activeSlotCount,
    canConfirm,
  } = useMovesetPanelState();

  const [confirmBusy, setConfirmBusy] = useState(false);
  const [confirmSuccess, setConfirmSuccess] = useState(false);
  const [confirmedFingerprint, setConfirmedFingerprint] = useState<string | null>(null);

  const loadoutFingerprint = snapshot.activeMovesets.join('\0');

  // Mantém "LOADOUT CONFIRMADO" enquanto o rascunho for o mesmo; some se o jogador editar.
  useEffect(() => {
    if (confirmedFingerprint === null) return;
    if (loadoutFingerprint !== confirmedFingerprint) {
      setConfirmSuccess(false);
      setConfirmedFingerprint(null);
    }
  }, [loadoutFingerprint, confirmedFingerprint]);

  const handleConfirm = useCallback(async (): Promise<void> => {
    if (confirmBusy || confirmSuccess || !canConfirm) return;
    setConfirmBusy(true);
    const confirmed = await getGlobalPlayerStore().confirmLoadout();
    setConfirmBusy(false);
    if (!confirmed) {
      alertSystem('Não foi possível salvar o loadout. Verifique a conexão com o servidor.');
      return;
    }

    const fingerprint = getGlobalPlayerStore().getSnapshot().activeMovesets.join('\0');
    setConfirmedFingerprint(fingerprint);
    setConfirmSuccess(true);
  }, [canConfirm, confirmBusy, confirmSuccess]);

  const classLabel = formatCombatClassLabel(classId);

  return (
    <MovablePanelFrame
      windowId="moveset"
      title="Moveset Loadout"
      zIndex={zIndex}
      focused={focused}
      panelClassName="world-panel--moveset ui-panel--moveset ui-panel--loadout"
      panelStyle={{ width: 'min(560px, 96vw)', maxHeight: 'min(640px, 90vh)' }}
      onFocus={() => tryFocusReactWorldPanel('moveset')}
      onClose={() => tryCloseReactWorldPanel('moveset')}
    >
      <div className="ui-panel__body ui-panel__body--loadout">
        <p className="loadout-hud__tag mb-1">CONFIG // BATALHA</p>
        <p className="loadout-hud__class mb-3 text-[11px] text-alter-accent" aria-label="Classe do personagem">
          {classLabel}
        </p>

        <section className="loadout-section" aria-label="Pool de movimentos">
          <h3 className="loadout-section__title">
            Coleção ({snapshot.availableMoveIds.length})
          </h3>
          <p className="loadout-section__hint">Clique para equipar · clique novamente para remover</p>
          <div className="loadout-pool" role="list">
            {snapshot.availableMoveIds.map((moveId) => {
              const move = resolveMoveDefinitionForUi(moveId);
              const label = move?.name ?? moveId;
              const abbrev = label.slice(0, 2).toUpperCase();
              const isActive = snapshot.activeMovesets.includes(moveId);

              return (
                <button
                  key={moveId}
                  type="button"
                  className={
                    isActive
                      ? 'loadout-pool-card loadout-pool-card--active loadout-pool-card--glow'
                      : 'loadout-pool-card'
                  }
                  role="listitem"
                  aria-label={`${label}${isActive ? ' — equipado' : ''}`}
                  aria-pressed={isActive}
                  disabled={confirmBusy}
                  onClick={() => getGlobalPlayerStore().toggleActiveMove(moveId)}
                  onMouseEnter={(event) => showMoveTooltip(event, moveId)}
                  onMouseLeave={hideMoveTooltip}
                >
                  <span className="loadout-pool-card__icon" aria-hidden="true">{abbrev}</span>
                  <span className="loadout-pool-card__name">{label}</span>
                  <MovesetMoveProgress
                    moveId={moveId}
                    moveName={label}
                    movesProgression={movesProgression}
                    characterLevel={characterLevel}
                  />
                </button>
              );
            })}
          </div>
        </section>

        <section className="loadout-section loadout-section--active mt-4" aria-label="Loadout ativo">
          <h3 className="loadout-section__title">
            Loadout Ativo ({activeSlotCount}/{ACTIVE_MOVESET_SLOT_COUNT})
          </h3>
          <div className="loadout-active-slots" role="list">
            {Array.from({ length: ACTIVE_MOVESET_SLOT_COUNT }, (_, index) => {
              const moveId = snapshot.activeMovesets[index];
              if (!moveId) {
                return (
                  <div
                    key={`empty-${index}`}
                    className="loadout-active-slot loadout-active-slot--empty"
                    role="listitem"
                    aria-label={`Slot vazio ${index + 1}`}
                  >
                    <span className="loadout-active-slot__placeholder">{index + 1}</span>
                  </div>
                );
              }

              const move = resolveMoveDefinitionForUi(moveId);
              const label = move?.name ?? moveId;
              const abbrev = label.slice(0, 2).toUpperCase();

              return (
                <button
                  key={moveId}
                  type="button"
                  className="loadout-active-slot loadout-active-slot--filled loadout-active-slot--glow"
                  role="listitem"
                  aria-label={`${label} — remover do loadout`}
                  disabled={confirmBusy}
                  onClick={() => getGlobalPlayerStore().removeActiveMove(moveId)}
                  onMouseEnter={(event) => showMoveTooltip(event, moveId)}
                  onMouseLeave={hideMoveTooltip}
                >
                  <span className="loadout-active-slot__icon" aria-hidden="true">{abbrev}</span>
                  <span className="loadout-active-slot__name">{label}</span>
                  <MovesetMoveProgress
                    moveId={moveId}
                    moveName={label}
                    movesProgression={movesProgression}
                    characterLevel={characterLevel}
                  />
                </button>
              );
            })}
          </div>
        </section>

        <footer className="loadout-footer mt-4">
          <button
            type="button"
            className={
              confirmSuccess
                ? 'loadout-confirm-btn loadout-confirm-btn--success'
                : 'loadout-confirm-btn'
            }
            disabled={!canConfirm || confirmBusy || confirmSuccess}
            aria-live="polite"
            onClick={() => { void handleConfirm(); }}
          >
            <span className="loadout-confirm-btn__label">
              {confirmSuccess ? 'LOADOUT CONFIRMADO' : confirmBusy ? 'SALVANDO…' : 'CONFIRMAR LOADOUT'}
            </span>
          </button>
        </footer>
      </div>
    </MovablePanelFrame>
  );
}
