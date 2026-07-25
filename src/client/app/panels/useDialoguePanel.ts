// @ts-nocheck
import { useCallback, useEffect, useMemo, useRef, useState, } from 'react';
import { HEAL_VOLT_COST, resolveHealVoltsCost, } from '../../../shared/world/npcHealService.js';
import { formatVolts } from '../../../shared/economy/premiumCurrency.js';
import { resolveCaelPetRationQuote } from '../../../shared/economy/caelPetService.js';
import { getActionDispatcher } from '../../ActionDispatcher.js';
import { consumeChroniclesAbsencePriority, fetchWorldChronicles, } from '../../services/worldLoreClient.js';
import { resolveWorldLoreCredentials } from '../../services/worldLoreCredentials.js';
import { hideInteractionCard } from '../../world/interactionCardController.js';
import { endWorldHudInteractionSession } from '../../world/worldHudInteractionSession.js';
import { alertSystem } from '../../ui/alertSystem.js';
import { ActionGatewayButtonController, } from '../../ui/components/ActionGatewayButton.js';
import { openSurvivalGuideCard } from '../../ui/components/SurvivalGuideCard.js';
import { closeAllNpcModals } from '../../ui/npcModalController.js';
import { getUiManager } from '../../ui/UIManager.js';
import { uiEvents, UIEventType } from '../../ui/uiEvents.js';
import { getPlayerEquipmentStore } from '../../ui/equipment/playerEquipmentStore.js';
import { getPlayerPetStore } from '../../ui/pet/playerPetStore.js';
import { buildDialoguePanelContent, isDialogueCael, } from '../../ui/dialogue/renderDialoguePanelView.js';
import { getNpcPanelContextBridge } from '../bridge/npcPanelContextBridge.js';
import { useActionGatewayAttach } from './useActionGatewayAttach.js';
import { closeHudWindow } from './panelWindowActions.js';
const EMPTY_DIALOGUE = {
    npcId: '',
    npcName: '',
    text: '',
};
export function useDialoguePanel(enabled) {
    const [state, setState] = useState(EMPTY_DIALOGUE);
    const [dialogueTick, setDialogueTick] = useState(0);
    const [chroniclesState, setChroniclesState] = useState({
        loading: false,
        error: null,
        snapshot: null,
    });
    const [gatewayTick, setGatewayTick] = useState(0);
    const panelRef = useRef(null);
    const bodyRef = useRef(null);
    const preserveWorldHudSessionRef = useRef(false);
    const healGatewayRef = useRef(new ActionGatewayButtonController(() => buildHealOptionsRef.current()));
    const rationGatewayRef = useRef(new ActionGatewayButtonController(() => buildRationOptionsRef.current()));
    const buildHealOptionsRef = useRef(() => ({}));
    const buildRationOptionsRef = useRef(() => ({}));
    const stateRef = useRef(state);
    stateRef.current = state;
    const isCael = isDialogueCael(state);
    const gatewayBusy = useMemo(() => ({
        healBusyAttrs: healGatewayRef.current.busyAttrs(),
        rationBusyAttrs: rationGatewayRef.current.busyAttrs(),
    }), [gatewayTick]);
    const panelContent = useMemo(() => buildDialoguePanelContent(state, chroniclesState, gatewayBusy), [state, chroniclesState, gatewayBusy]);
    const bumpGateway = useCallback(() => {
        setGatewayTick((tick) => tick + 1);
    }, []);
    useEffect(() => {
        if (!enabled)
            return;
        hideInteractionCard();
    }, [enabled]);
    useEffect(() => {
        if (!enabled)
            return;
        return getNpcPanelContextBridge().subscribe((snapshot) => {
            if (snapshot.dialogue) {
                setState({ ...snapshot.dialogue });
                setDialogueTick(snapshot.dialogueTick);
                setChroniclesState({
                    loading: false,
                    error: null,
                    snapshot: null,
                });
            }
        });
    }, [enabled]);
    useEffect(() => {
        if (!enabled || !isCael || !state.npcId)
            return;
        let cancelled = false;
        setChroniclesState({
            loading: true,
            error: null,
            snapshot: null,
        });
        const creds = resolveWorldLoreCredentials();
        const prioritizeAbsence = consumeChroniclesAbsencePriority();
        void fetchWorldChronicles({
            playerId: creds.playerId,
            characterId: creds.characterId,
            prioritizeAbsence,
        })
            .then((snapshot) => {
            if (cancelled)
                return;
            setChroniclesState({
                loading: false,
                error: null,
                snapshot,
            });
        })
            .catch(() => {
            if (cancelled)
                return;
            setChroniclesState({
                loading: false,
                error: 'Os pergaminhos estão embaralhados… tente de novo em instantes.',
                snapshot: null,
            });
        });
        return () => {
            cancelled = true;
        };
    }, [enabled, isCael, state.npcId, dialogueTick]);
    buildHealOptionsRef.current = () => {
        const current = stateRef.current;
        const level = getPlayerEquipmentStore().getSnapshot().level;
        const voltsCost = resolveHealVoltsCost(level);
        const healSub = voltsCost > 0 ? formatVolts(HEAL_VOLT_COST) : 'Grátis (novatos)';
        return {
            renderContent: (button, pending) => {
                button.innerHTML = pending
                    ? `<span class="cael-panel__action-icon" aria-hidden="true">+</span>
             <span class="cael-panel__action-text">
               <strong>Curando…</strong>
               <small>Aguardando servidor…</small>
             </span>`
                    : `<span class="cael-panel__action-icon" aria-hidden="true">+</span>
             <span class="cael-panel__action-text">
               <strong>Recuperar Vida</strong>
               <small>${healSub}</small>
             </span>`;
            },
            onClick: () => {
                const result = getActionDispatcher().dispatch({
                    type: 'HEAL_AT_NPC',
                    payload: {
                        npcId: current.npcId,
                    },
                });
                if (!result.ok) {
                    alertSystem(result.reason);
                    return;
                }
                if (result.status === 'applied')
                    bumpGateway();
                return result;
            },
        };
    };
    buildRationOptionsRef.current = () => {
        const current = stateRef.current;
        const rationQuote = resolveCaelPetRationQuote();
        return {
            renderContent: (button, pending) => {
                button.innerHTML = pending
                    ? `<span class="cael-panel__action-icon" aria-hidden="true">🍖</span>
             <span class="cael-panel__action-text">
               <strong>Comprando…</strong>
               <small>Aguardando servidor…</small>
             </span>`
                    : `<span class="cael-panel__action-icon" aria-hidden="true">🍖</span>
             <span class="cael-panel__action-text">
               <strong>Comprar Ração Especial</strong>
               <small>${formatVolts(rationQuote.priceVolts)} · ${rationQuote.chargesPerStack} cargas na HUD Pet Love</small>
             </span>`;
            },
            onClick: () => {
                const result = getActionDispatcher().dispatch({
                    type: 'CAEL_BUY_PET_RATION',
                    payload: { npcId: current.npcId },
                });
                if (!result.ok) {
                    alertSystem(result.reason);
                    return;
                }
                if (result.status === 'applied') {
                    const total = getPlayerPetStore().getRationCharges();
                    alertSystem(`Ração Especial adquirida. ${total} carga${total === 1 ? '' : 's'} na HUD Pet Love.`);
                    bumpGateway();
                }
                return result;
            },
        };
    };
    useActionGatewayAttach(bodyRef, enabled && isCael, [
        { selector: '[data-action="heal"]', buildOptions: () => buildHealOptionsRef.current() },
        { selector: '[data-action="cael-ration-buy"]', buildOptions: () => buildRationOptionsRef.current() },
    ], `${panelContent.bodyHtml}|${gatewayTick}`);
    const requestClose = useCallback(() => {
        if (isDialogueCael(stateRef.current)) {
            closeAllNpcModals(getUiManager()?.dialogue ?? undefined);
            return;
        }
        closeHudWindow('dialogue');
    }, []);
    const handleClick = useCallback((event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement))
            return;
        if (target.closest('[data-action="close"]')) {
            event.preventDefault();
            event.stopPropagation();
            requestClose();
            return;
        }
        const actionEl = target.closest('[data-action]');
        const action = actionEl?.dataset.action;
        if (!action || !actionEl)
            return;
        if (action === 'close') {
            requestClose();
            return;
        }
        event.preventDefault();
        event.stopPropagation();
        if (action === 'refraction-accept') {
            preserveWorldHudSessionRef.current = true;
            closeHudWindow('dialogue');
            uiEvents.emit(UIEventType.REFRACTION_CHALLENGE_ACCEPT, {});
            return;
        }
        if (action === 'survival-guide') {
            openSurvivalGuideCard();
            return;
        }
    }, [requestClose]);
    useEffect(() => {
        if (!enabled)
            return;
        return () => {
            if (preserveWorldHudSessionRef.current) {
                preserveWorldHudSessionRef.current = false;
                return;
            }
            const snapshot = endWorldHudInteractionSession();
            if (snapshot) {
                uiEvents.emit(UIEventType.RESTORE_WORLD_PLAYER_POSITION, snapshot);
            }
        };
    }, [enabled]);
    useEffect(() => () => {
        healGatewayRef.current.destroy();
        rationGatewayRef.current.destroy();
    }, []);
    return {
        state,
        headerHtml: panelContent.headerHtml,
        bodyHtml: panelContent.bodyHtml,
        panelClassName: panelContent.panelClassName,
        isCael,
        panelRef,
        bodyRef,
        handleClick,
    };
}
