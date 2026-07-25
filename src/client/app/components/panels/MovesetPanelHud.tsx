// @ts-nocheck
import { useEffect, useRef } from 'react';
import { ACTIVE_MOVESET_SLOT_COUNT } from '../../../../shared/combat/moveTypes.js';
import { resolveMoveProgressionForChar } from '../../../../shared/progression/moveMasteryCap.js';
import { totalMasteryXpFromSnapshot } from '../../../../shared/progression/moveProgression.js';
import { buildMoveMasteryProgressionTooltip, resolveProgressionPercent, } from '../../../../shared/progression/progressionTooltipContent.js';
import { patchProgressionTooltipAttrs } from '../../../ui/tooltip/progressionTooltipAttrs.js';
import { uiEvents, UIEventType } from '../../../ui/uiEvents.js';
import { resolveMoveDefinitionForUi } from '../../../../shared/combat/movesetLoadout.js';
import { closeHudWindow } from '../../panels/panelWindowActions.js';
import { resolveMoveLabel, useMovesetLoadout, } from '../../panels/useMovesetLoadout.js';
import { MovablePanelShell } from './MovablePanelShell.js';
function MoveLoadoutProgress({ moveId, moveName, movesProgression, characterLevel, }) {
    const barRef = useRef(null);
    const snap = movesProgression.byMoveId[moveId];
    const masteryXp = snap ? totalMasteryXpFromSnapshot(snap) : 0;
    const progression = resolveMoveProgressionForChar(moveId, masteryXp, characterLevel);
    const capped = progression.masteryCappedForCharLevel === true;
    const pct = capped
        ? 100
        : resolveProgressionPercent(progression.xp, progression.nextLevelThreshold);
    useEffect(() => {
        const bar = barRef.current;
        if (!bar)
            return;
        patchProgressionTooltipAttrs(bar, buildMoveMasteryProgressionTooltip(moveId, progression, moveName));
    }, [characterLevel, moveId, moveName, progression]);
    return (<div className="loadout-card__progress">
      <span className="loadout-card__level">
        Nvl.
        {' '}
        {progression.level}
      </span>
      <div ref={barRef} className={[
            'loadout-card__xp-bar',
            capped ? 'loadout-card__xp-bar--mastery-capped' : '',
        ].filter(Boolean).join(' ')} role="progressbar" aria-valuenow={capped ? progression.masteryCapLevel ?? progression.level : progression.xp} aria-valuemax={capped ? progression.masteryCapLevel ?? progression.level : progression.nextLevelThreshold} aria-label={capped ? 'Domínio no teto para o nível atual' : 'Domínio do movimento'}>
        <div className={[
            'loadout-card__xp-fill',
            capped ? 'loadout-card__xp-fill--mastery-capped' : '',
        ].filter(Boolean).join(' ')} style={{ width: `${pct}%` }}/>
      </div>
      {capped ? (<span className="loadout-card__cap-label">MAX LEVEL PARA NÍVEL ATUAL</span>) : null}
    </div>);
}
function MoveTooltipWrap({ moveId, children, }) {
    return (<div data-move-id={moveId} onMouseEnter={(event) => {
            if (event.target.closest('[data-progression-tooltip]'))
                return;
            const move = resolveMoveDefinitionForUi(moveId);
            if (!move)
                return;
            const rect = event.currentTarget.getBoundingClientRect();
            uiEvents.emit(UIEventType.SHOW_TOOLTIP, {
                data: { kind: 'move', data: move },
                x: rect.left + rect.width / 2,
                y: rect.top,
                placement: 'above',
            });
        }} onMouseLeave={() => uiEvents.emit(UIEventType.HIDE_TOOLTIP, {})}>
      {children}
    </div>);
}
export function MovesetPanelHud({ focused }) {
    const { view, togglePoolMove, removeActiveMove, confirmLoadout } = useMovesetLoadout(true);
    const activeCount = view.snapshot.activeMovesets.length;
    const canConfirm = activeCount === ACTIVE_MOVESET_SLOT_COUNT;
    const confirmDisabled = !canConfirm || view.confirmFeedbackActive || view.confirmInFlight;
    const confirmLabel = view.confirmFeedbackActive ? 'LOADOUT CONFIRMADO!' : 'CONFIRMAR LOADOUT';
    const header = (<header className="ui-panel__header" data-panel-drag-handle>
      <div>
        <span className="loadout-hud__tag">CONFIG // BATALHA</span>
        <div className="loadout-hud__title-row">
          <h2 className="ui-panel__title">Moveset Loadout</h2>
          <span className="loadout-hud__class" aria-label="Classe do personagem">
            {view.classLabel}
          </span>
        </div>
      </div>
      <button type="button" className="ui-panel__close" data-action="close" aria-label="Fechar Moveset" onClick={() => closeHudWindow('moveset')}>
        ×
      </button>
    </header>);
    return (<MovablePanelShell panelId="moveset" className="ui-panel--moveset ui-panel--loadout" title="Moveset Loadout" focused={focused} customHeader={header} bodyClassName="ui-panel__body ui-panel__body--loadout">
      <section className="loadout-section" aria-label="Pool de movimentos">
        <h3 className="loadout-section__title">
          Coleção (
          {view.snapshot.availableMoveIds.length}
          )
        </h3>
        <p className="loadout-section__hint">Clique para equipar · clique novamente para remover</p>
        <div className="loadout-pool" role="list">
          {view.snapshot.availableMoveIds.map((moveId) => {
            const { label, abbrev } = resolveMoveLabel(moveId);
            const isActive = view.snapshot.activeMovesets.includes(moveId);
            return (<MoveTooltipWrap key={moveId} moveId={moveId}>
                <button type="button" className={[
                    'loadout-pool-card',
                    isActive ? 'loadout-pool-card--active loadout-pool-card--glow' : '',
                ].filter(Boolean).join(' ')} role="listitem" data-pool-move={moveId} aria-label={`${label}${isActive ? ' — equipado' : ''}`} aria-pressed={isActive} onClick={() => togglePoolMove(moveId)}>
                  <span className="loadout-pool-card__icon" aria-hidden="true">{abbrev}</span>
                  <span className="loadout-pool-card__name">{label}</span>
                  <MoveLoadoutProgress moveId={moveId} moveName={label} movesProgression={view.movesProgression} characterLevel={view.characterLevel}/>
                </button>
              </MoveTooltipWrap>);
        })}
        </div>
      </section>

      <section className="loadout-section loadout-section--active" aria-label="Loadout ativo">
        <h3 className="loadout-section__title">
          Loadout Ativo (
          {activeCount}
          /
          {ACTIVE_MOVESET_SLOT_COUNT}
          )
        </h3>
        <div className="loadout-active-slots" role="list">
          {Array.from({ length: ACTIVE_MOVESET_SLOT_COUNT }, (_, index) => {
            const moveId = view.snapshot.activeMovesets[index];
            if (!moveId) {
                return (<div key={`empty-${index}`} className="loadout-active-slot loadout-active-slot--empty" role="listitem" aria-label={`Slot vazio ${index + 1}`}>
                  <span className="loadout-active-slot__placeholder">{index + 1}</span>
                </div>);
            }
            const { label, abbrev } = resolveMoveLabel(moveId);
            return (<MoveTooltipWrap key={moveId} moveId={moveId}>
                <button type="button" className="loadout-active-slot loadout-active-slot--filled loadout-active-slot--glow" role="listitem" data-active-move={moveId} aria-label={`${label} — remover do loadout`} onClick={() => removeActiveMove(moveId)}>
                  <span className="loadout-active-slot__icon" aria-hidden="true">{abbrev}</span>
                  <span className="loadout-active-slot__name">{label}</span>
                  <MoveLoadoutProgress moveId={moveId} moveName={label} movesProgression={view.movesProgression} characterLevel={view.characterLevel}/>
                </button>
              </MoveTooltipWrap>);
        })}
        </div>
      </section>

      <footer className="loadout-footer">
        <button type="button" className={[
            'loadout-confirm-btn',
            view.confirmFeedbackActive ? 'loadout-confirm-btn--success' : '',
        ].filter(Boolean).join(' ')} data-action="confirm-loadout" disabled={confirmDisabled} aria-live="polite" onClick={() => void confirmLoadout()}>
          <span className="loadout-confirm-btn__label">{confirmLabel}</span>
        </button>
      </footer>
    </MovablePanelShell>);
}
