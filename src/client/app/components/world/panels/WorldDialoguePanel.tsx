import { useCallback, useEffect, useMemo, useRef } from 'react';
import { getActionDispatcher } from '../../../../ActionDispatcher.js';
import { formatVolts } from '../../../../../shared/economy/premiumCurrency.js';
import { hideInteractionCard } from '../../../../world/interactionCardController.js';
import { closeAllNpcModals } from '../../../../ui/npcModalController.js';
import { alertSystem } from '../../../../ui/alertSystem.js';
import { setPlayerAtMarcosResetNpc } from '../../../../ui/marcos/marcosTrailResetGate.js';
import { openSurvivalGuideCard } from '../../../../ui/components/SurvivalGuideCard.js';
import type { WorldPanelContext } from '../../../store/worldPanelContext.js';
import { useWorldPanelsStore } from '../../../store/worldPanelsStore.js';
import { registerReactDialogueHandle } from '../../../panels/dialogueReactBridge.js';
import { tryCloseReactWorldPanel, tryFocusReactWorldPanel } from '../../../panels/initWorldPanelsBridge.js';
import { requestReactRefractionNpcStart } from '../../../panels/refractionBoothBridge.js';
import { useActionGatewaySubmit } from '../../../panels/useActionGatewaySubmit.js';
import { useReleaseWorldHudOnPanelClose } from '../../../panels/useReleaseWorldHudOnPanelClose.js';
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

  useReleaseWorldHudOnPanelClose('dialogue', () => (
    !preserveWorldHudRef.current && !suppressWorldHudReleaseRef.current
  ));

  useEffect(() => {
    hideInteractionCard();
  }, []);

  useEffect(() => () => {
    setPlayerAtMarcosResetNpc(false);
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

  const handleHearChronicle = useCallback(() => {
    return getActionDispatcher().dispatch({
      type: 'CAEL_HEAR_CHRONICLE',
      payload: { npcId: dialogue.npcId },
    });
  }, [dialogue.npcId]);

  const healGateway = useActionGatewaySubmit({ onClick: handleHeal });
  const hearGateway = useActionGatewaySubmit({ onClick: handleHearChronicle });

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
    ? 'world-panel--dialogue ui-panel--dialogue ui-panel--dialogue-cael ui-panel--dialogue-hybrid ui-skin-hybrid'
    : 'world-panel--dialogue ui-panel--dialogue ui-panel--dialogue-generic ui-panel--dialogue-hybrid ui-skin-hybrid';

  const panelStyle = state.isCael
    ? { width: 'min(720px, 98vw)' }
    : { width: 'min(420px, 96vw)' };

  return (
    <MovablePanelFrame
      windowId="dialogue"
      title={dialogue.npcName || 'NPC'}
      titleMeta={state.isCael ? '// NPC // CAEL' : '// NPC // DIALOG'}
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
                Companheiros vivem 15 meses (25 anos). Compre ração no Vendedor e alimente na HUD Pet Love.
                {state.healFreeHint
                  ? ' Novatos até nível 5 curam gratuitamente.'
                  : ' Serviço de cura — desconto automático em VOLTS.'}
              </p>
            </aside>

            <section className="cael-panel__chronicles" aria-label="Crônicas de Altercadia">
              <h3 className="cael-panel__section-label">{state.chronicleBookTitle}</h3>
              <div className="cael-panel__scroll">
                <div className="cael-panel__journal">
                  <p className="cael-panel__book-kicker">O que ouvi</p>
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
                    <div className="cael-panel__chronicles-feed">
                      {state.chroniclesSnapshot.lines.map((line) => (
                        <article
                          key={line.entryId}
                          className="cael-panel__chronicle"
                          data-hud-priority={resolveChroniclePriority(line)}
                        >
                          <p className="cael-panel__chronicle-text">{line.narrative}</p>
                        </article>
                      ))}
                    </div>
                  )}
                </div>

                <div className="cael-panel__book">
                  <p className="cael-panel__book-kicker">Livro I</p>
                  {state.unlockedChapters.length === 0 ? (
                    <p className="cael-panel__chronicles-status">
                      O tomo está fechado. Pede ao Cael que leia a primeira passagem.
                    </p>
                  ) : (
                    state.unlockedChapters.map((chapter) => (
                      <article key={chapter.id} className="cael-panel__book-chapter">
                        <h4 className="cael-panel__book-title">{chapter.title}</h4>
                        {chapter.body.split('\n\n').map((paragraph) => (
                          <p key={paragraph.slice(0, 24)} className="cael-panel__book-body">
                            {paragraph}
                          </p>
                        ))}
                        {chapter.questHookNote ? (
                          <p className="cael-panel__book-hook">{chapter.questHookNote}</p>
                        ) : null}
                      </article>
                    ))
                  )}
                </div>
              </div>
              <button
                type="button"
                className="cael-panel__hear"
                disabled={hearGateway.pending || state.chronicleTomeComplete}
                aria-busy={hearGateway.pending}
                onClick={hearGateway.submit}
              >
                {hearGateway.pending
                  ? 'Cael abre o tomo…'
                  : state.chronicleTomeComplete
                    ? 'O tomo, por ora, já foi lido.'
                    : state.nextChapter
                      ? `Ouvir: ${state.nextChapter.title}`
                      : 'Ouvir o próximo capítulo'}
              </button>
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
