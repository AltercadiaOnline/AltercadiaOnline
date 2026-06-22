import { useCallback, useEffect, useMemo, useRef } from 'react';
import { getActionDispatcher } from '../../../../ActionDispatcher.js';
import { formatVolts } from '../../../../../shared/economy/premiumCurrency.js';
import { getPlayerPetStore } from '../../../../ui/pet/playerPetStore.js';
import { hideInteractionCard } from '../../../../world/interactionCardController.js';
import { endWorldHudInteractionSession } from '../../../../world/worldHudInteractionSession.js';
import { closeAllNpcModals } from '../../../../ui/npcModalController.js';
import { alertSystem } from '../../../../ui/alertSystem.js';
import { setPlayerAtMarcosResetNpc } from '../../../../ui/marcos/marcosTrailResetGate.js';
import { openSurvivalGuideCard } from '../../../../ui/components/SurvivalGuideCard.js';
import { uiEvents, UIEventType } from '../../../../ui/uiEvents.js';
import type { WorldPanelContext } from '../../../store/worldPanelContext.js';
import { useWorldPanelsStore } from '../../../store/worldPanelsStore.js';
import { registerReactDialogueHandle } from '../../../panels/dialogueReactBridge.js';
import { tryCloseReactWorldPanel, tryFocusReactWorldPanel } from '../../../panels/initWorldPanelsBridge.js';
import { requestReactRefractionNpcStart } from '../../../panels/refractionBoothBridge.js';
import { useActionGatewaySubmit } from '../../../panels/useActionGatewaySubmit.js';
import {
  resolveChroniclePriority,
  resolveDialogueFromContext,
  useDialoguePanelState,
} from '../../../panels/useDialoguePanelState.js';
import { MovablePanelFrame } from '../MovablePanelFrame.js';

type WorldDialoguePanelProps = {
  context: Extract<WorldPanelContext, { kind: 'dialogue' }>;
  zIndex: number;
  focused: boolean;
  onFocus: () => void;
};

export function WorldDialoguePanel({
  context,
  zIndex,
  focused,
  onFocus,
}: WorldDialoguePanelProps) {
  const dialogue = useMemo(() => resolveDialogueFromContext(context), [context]);
  const state = useDialoguePanelState(dialogue);
  const preserveWorldHudRef = useRef(false);
  const suppressWorldHudReleaseRef = useRef(false);

  useEffect(() => {
    hideInteractionCard();
  }, []);

  useEffect(() => {
    registerReactDialogueHandle({
      isOpen: () => useWorldPanelsStore.getState().openPanels.some(
        (panel) => panel.windowId === 'dialogue',
      ),
      dismissWithoutWorldSession: () => {
        suppressWorldHudReleaseRef.current = true;
        tryCloseReactWorldPanel('dialogue');
      },
    });
    return () => registerReactDialogueHandle(null);
  }, []);

  useEffect(() => () => {
    if (!preserveWorldHudRef.current && !suppressWorldHudReleaseRef.current) {
      const snapshot = endWorldHudInteractionSession();
      if (snapshot) {
        uiEvents.emit(UIEventType.RESTORE_WORLD_PLAYER_POSITION, snapshot);
      }
    }
    setPlayerAtMarcosResetNpc(false);
    preserveWorldHudRef.current = false;
    suppressWorldHudReleaseRef.current = false;
  }, []);

  const handleClose = useCallback(() => {
    if (state.isCael && !suppressWorldHudReleaseRef.current) {
      closeAllNpcModals({
        isOpen: () => true,
        dismissWithoutWorldSession: () => {
          suppressWorldHudReleaseRef.current = true;
          tryCloseReactWorldPanel('dialogue');
        },
      });
      return;
    }
    tryCloseReactWorldPanel('dialogue');
  }, [state.isCael]);

  const handleHeal = useCallback(() => {
    return getActionDispatcher().dispatch({
      type: 'HEAL_AT_NPC',
      payload: { npcId: dialogue.npcId },
    });
  }, [dialogue.npcId]);

  const handleRation = useCallback(() => {
    return getActionDispatcher().dispatch({
      type: 'CAEL_BUY_PET_RATION',
      payload: { npcId: dialogue.npcId },
    });
  }, [dialogue.npcId]);

  const healGateway = useActionGatewaySubmit({ onClick: handleHeal });
  const rationGateway = useActionGatewaySubmit({
    onClick: handleRation,
    onResolved: () => {
      const total = getPlayerPetStore().getRationCharges();
      alertSystem(
        `Ração Especial adquirida. ${total} carga${total === 1 ? '' : 's'} na HUD Pet Love.`,
      );
    },
  });

  const handleResetMarcosTrail = useCallback(() => {
    return getActionDispatcher().dispatch({
      type: 'RESET_MARCO_TRAIL',
      payload: { npcId: dialogue.npcId },
    });
  }, [dialogue.npcId]);

  const resetTrailGateway = useActionGatewaySubmit({
    onClick: handleResetMarcosTrail,
    onResolved: () => {
      alertSystem('Trilha Marcos reiniciada. Escolha uma nova ramificação na Ficha.');
      tryCloseReactWorldPanel('dialogue');
    },
  });

  const handleRefractionAccept = () => {
    preserveWorldHudRef.current = true;
    tryCloseReactWorldPanel('dialogue');
    requestReactRefractionNpcStart();
  };

  const panelClassName = state.isCael
    ? 'world-panel--dialogue ui-panel--dialogue ui-panel--dialogue-cael'
    : state.isRefractionInstructor
      ? 'world-panel--dialogue ui-panel--dialogue ui-panel--dialogue-generic'
      : 'world-panel--dialogue ui-panel--dialogue ui-panel--dialogue-generic';

  const panelStyle = state.isCael
    ? { width: 'min(720px, 98vw)' }
    : { width: 'min(420px, 96vw)' };

  return (
    <MovablePanelFrame
      windowId="dialogue"
      title={dialogue.npcName || 'NPC'}
      zIndex={zIndex}
      focused={focused}
      panelClassName={panelClassName}
      panelStyle={panelStyle}
      onFocus={onFocus ?? (() => tryFocusReactWorldPanel('dialogue'))}
      onClose={handleClose}
    >
      {state.isCael ? (
        <div className="cael-panel">
          <p className="cael-panel__tag">TERMINAL // ANCIÃO CAEL</p>
          <p className="cael-panel__greeting">{dialogue.text}</p>

          <div className="cael-panel__body">
            <aside className="cael-panel__tools" aria-label="Ferramentas de suporte">
              <h3 className="cael-panel__section-label">Ferramentas de Suporte</h3>
              <div className="cael-panel__actions">
                <button
                  type="button"
                  className="cael-panel__action cael-panel__action--heal"
                  disabled={healGateway.pending}
                  aria-busy={healGateway.pending}
                  onClick={healGateway.submit}
                >
                  <span className="cael-panel__action-icon" aria-hidden="true">+</span>
                  <span className="cael-panel__action-text">
                    <strong>{healGateway.pending ? 'Curando…' : 'Recuperar Vida'}</strong>
                    <small>{healGateway.pending ? 'Aguardando servidor…' : state.healSub}</small>
                  </span>
                </button>
                <button
                  type="button"
                  className="cael-panel__action cael-panel__action--pet"
                  disabled={rationGateway.pending}
                  aria-busy={rationGateway.pending}
                  onClick={rationGateway.submit}
                >
                  <span className="cael-panel__action-icon" aria-hidden="true">🍖</span>
                  <span className="cael-panel__action-text">
                    <strong>{rationGateway.pending ? 'Comprando…' : 'Comprar Ração Especial'}</strong>
                    <small>
                      {rationGateway.pending
                        ? 'Aguardando servidor…'
                        : `${formatVolts(state.rationQuote.priceVolts)} · ${state.rationQuote.chargesPerStack} cargas na HUD Pet Love`}
                    </small>
                  </span>
                </button>
                <button
                  type="button"
                  className="cael-panel__action"
                  onClick={() => openSurvivalGuideCard()}
                >
                  <span className="cael-panel__action-icon" aria-hidden="true">?</span>
                  <span className="cael-panel__action-text">
                    <strong>Guia de Sobrevivência</strong>
                    <small>Dicas práticas para expedições</small>
                  </span>
                </button>
              </div>
              <p className="cael-panel__tools-hint">
                Companheiros vivem 15 meses (25 anos). Compre ração aqui e alimente na HUD Pet Love.
                {state.healFreeHint
                  ? ' Novatos até nível 5 curam gratuitamente.'
                  : ' Serviço de cura — desconto automático em VOLTS.'}
              </p>
            </aside>

            <section className="cael-panel__chronicles" aria-label="Crônicas de Altercadia">
              <h3 className="cael-panel__section-label">Crônicas de Altercadia</h3>
              <div className="cael-panel__scroll">
                {state.chroniclesLoading ? (
                  <p className="cael-panel__chronicles-status">Cael consulta os pergaminhos…</p>
                ) : state.chroniclesError ? (
                  <p className="cael-panel__chronicles-status cael-panel__chronicles-status--error">
                    {state.chroniclesError}
                  </p>
                ) : !state.chroniclesSnapshot || state.chroniclesSnapshot.lines.length === 0 ? (
                  <p className="cael-panel__chronicles-status">
                    Nenhum rumor novo chegou aos ouvidos do Ancião.
                  </p>
                ) : (
                  <>
                    {state.chroniclesSnapshot.absenceIntro ? (
                      <p className="cael-panel__chronicles-intro">
                        {state.chroniclesSnapshot.absenceIntro}
                      </p>
                    ) : null}
                    <div className="cael-panel__chronicles-feed">
                      {state.chroniclesSnapshot.lines.map((line) => (
                        <article
                          key={line.entryId}
                          className={`cael-panel__chronicle${line.missedWhileAway ? ' cael-panel__chronicle--missed' : ''}`}
                          data-hud-priority={resolveChroniclePriority(line)}
                        >
                          <p className="cael-panel__chronicle-text">{line.narrative}</p>
                        </article>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </section>
          </div>
        </div>
      ) : state.isRefractionInstructor ? (
        <div className="ui-dialogue-body">
          <p className="ui-dialogue-text">{dialogue.text}</p>
          <p className="ui-dialogue-heal-hint">
            Entrada: {formatVolts(state.refractionEntryCost)} — desafio de ~45s.
          </p>
          <div className="ui-dialogue-choices">
            <button
              type="button"
              className="ui-dialogue-heal-btn ui-dialogue-choice--accept"
              onClick={handleRefractionAccept}
            >
              Sim, participar
            </button>
            <button
              type="button"
              className="ui-dialogue-heal-btn ui-dialogue-choice--decline"
              onClick={handleClose}
            >
              Não, obrigado
            </button>
          </div>
        </div>
      ) : state.isMarcosTrailMaster ? (
        <div className="ui-dialogue-body">
          <p className="ui-dialogue-text">{dialogue.text}</p>
          <p className="ui-dialogue-heal-hint">
            Isso zera marcos ativos e progressão de nós. Ação irreversível.
          </p>
          <div className="ui-dialogue-choices">
            <button
              type="button"
              className="ui-dialogue-heal-btn ui-dialogue-choice--accept"
              disabled={resetTrailGateway.pending}
              aria-busy={resetTrailGateway.pending}
              onClick={resetTrailGateway.submit}
            >
              {resetTrailGateway.pending ? 'Resetando…' : 'Resetar trilha'}
            </button>
            <button
              type="button"
              className="ui-dialogue-heal-btn ui-dialogue-choice--decline"
              onClick={handleClose}
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <div className="ui-dialogue-body">
          <p className="ui-dialogue-text">{dialogue.text}</p>
        </div>
      )}
    </MovablePanelFrame>
  );
}
