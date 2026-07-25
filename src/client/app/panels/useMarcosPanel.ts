// @ts-nocheck
import { useCallback, useEffect, useMemo, useState } from 'react';
import { getActionDispatcher } from '../../ActionDispatcher.js';
import { getDataStore } from '../../economy/economyLayer.js';
import { getPlayerEquipmentStore } from '../../ui/equipment/playerEquipmentStore.js';
import { alertSystem } from '../../ui/alertSystem.js';
import { uiEvents, UIEventType } from '../../ui/uiEvents.js';
import { MARCO_ABILITY_LEVEL_MIN_PLAYER_LEVEL } from '../../../shared/progression/marcoProgression.js';
import { buildMarcoTreeView, buildMarcoTooltipPayload, canChooseMarco, canSelectBranchStarter, resolveMarcoChooseBlockedMessage, resolveRamificacaoFromContext, } from '../../../shared/progression/milestoneTreeState.js';
import { isMarcoBranchStarter } from '../../../shared/progression/milestoneTreeCatalog.js';
import { findMarcoNodeView, renderMarcoBranchConfirmOverlay, renderMarcoGrid, } from '../../ui/marcos/renderMilestoneTree.js';
function buildPlayerContext() {
    const marcosState = getDataStore().getMarcosState();
    const playerLevel = getPlayerEquipmentStore().getSnapshot().level;
    return {
        activeMarcos: marcosState.activeMarcos,
        flowSpeedBase: marcosState.flowSpeedBase,
        milestoneTotalProgress: marcosState.milestoneTotalProgress,
        playerLevel,
        ramificacaoSelecionada: resolveRamificacaoFromContext(marcosState.ramificacaoSelecionada),
        trilhaTravada: marcosState.trilhaTravada,
        nodeProgression: marcosState.nodeProgression,
    };
}
function buildMarcosStructuralKey(state) {
    return `${state.ramificacaoSelecionada ?? ''}|${state.trilhaTravada}|${state.activeMarcos.join(',')}`;
}
function buildRenderModel(hoverNodeId) {
    const marcosState = getDataStore().getMarcosState();
    return {
        nodes: buildMarcoTreeView(buildPlayerContext()),
        selectedNodeId: null,
        hoverNodeId,
        ramificacaoSelecionada: resolveRamificacaoFromContext(marcosState.ramificacaoSelecionada),
        trilhaTravada: marcosState.trilhaTravada,
    };
}
export function useMarcosPanel(enabled) {
    const [hoverNodeId, setHoverNodeId] = useState(null);
    const [pendingBranchNodeId, setPendingBranchNodeId] = useState(null);
    const [structuralTick, setStructuralTick] = useState(0);
    const dispatcher = getActionDispatcher();
    const dataStore = getDataStore();
    useEffect(() => {
        if (!enabled)
            return;
        let structuralKey = buildMarcosStructuralKey(dataStore.getMarcosState());
        const unsub = dataStore.subscribe('marcosState', (state) => {
            setPendingBranchNodeId((pending) => (pending && state.trilhaTravada ? null : pending));
            const nextKey = buildMarcosStructuralKey(state);
            if (nextKey !== structuralKey) {
                structuralKey = nextKey;
                setStructuralTick((tick) => tick + 1);
            }
        });
        return () => {
            unsub();
            setHoverNodeId(null);
            setPendingBranchNodeId(null);
            uiEvents.emit(UIEventType.HIDE_TOOLTIP, {});
        };
    }, [dataStore, enabled]);
    const model = useMemo(() => buildRenderModel(hoverNodeId), [hoverNodeId, structuralTick]);
    const pendingNode = findMarcoNodeView(model.nodes, pendingBranchNodeId);
    const treeHtml = useMemo(() => renderMarcoGrid(model), [model]);
    const overlayHtml = pendingNode ? renderMarcoBranchConfirmOverlay(pendingNode) : '';
    const legendHtml = `
    <span class="marcos-legend marcos-legend--active">◆ Ativo</span>
    <span class="marcos-legend marcos-legend--available">○ Disponível</span>
    <span class="marcos-legend marcos-legend--locked">🔒 Bloqueado</span>
    <span class="marcos-legend marcos-legend--gates">Nv. habilidade 1–5: personagem ${MARCO_ABILITY_LEVEL_MIN_PLAYER_LEVEL.join(' / ')}</span>
  `;
    const handleClick = useCallback((event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement))
            return;
        if (target.closest('[data-action="cancel-branch"]')) {
            setPendingBranchNodeId(null);
            return;
        }
        const confirmBtn = target.closest('[data-action="confirm-branch"]');
        if (confirmBtn?.dataset.marcoId) {
            const result = dispatcher.dispatch({
                type: 'SELECT_MARCO_BRANCH',
                payload: { starterNodeId: confirmBtn.dataset.marcoId },
            });
            if (result.ok && result.status === 'applied') {
                setPendingBranchNodeId(null);
            }
            else if (!result.ok) {
                const ctx = buildPlayerContext();
                const blocked = resolveMarcoChooseBlockedMessage(confirmBtn.dataset.marcoId, ctx);
                if (blocked)
                    alertSystem(blocked);
                else
                    alertSystem(result.reason);
            }
            return;
        }
        if (pendingBranchNodeId)
            return;
        const nodeBtn = target.closest('[data-marco-node]');
        if (!nodeBtn?.dataset.marcoNode)
            return;
        const nodeId = nodeBtn.dataset.marcoNode;
        const ctx = buildPlayerContext();
        if (canSelectBranchStarter(nodeId, ctx)) {
            setPendingBranchNodeId(nodeId);
            return;
        }
        if (isMarcoBranchStarter(nodeId) && !ctx.ramificacaoSelecionada) {
            const blocked = resolveMarcoChooseBlockedMessage(nodeId, ctx);
            if (blocked)
                alertSystem(blocked);
            return;
        }
        if (canChooseMarco(nodeId, ctx)) {
            const result = dispatcher.dispatch({ type: 'CHOOSE_MARCO', payload: { nodeId } });
            if (!result.ok) {
                const blocked = resolveMarcoChooseBlockedMessage(nodeId, ctx);
                if (blocked)
                    alertSystem(blocked);
                else
                    alertSystem(result.reason);
            }
            return;
        }
        const blocked = resolveMarcoChooseBlockedMessage(nodeId, ctx);
        if (blocked)
            alertSystem(blocked);
    }, [dispatcher, pendingBranchNodeId]);
    const handleMouseOver = useCallback((event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement))
            return;
        if (target.closest('[data-progression-tooltip]'))
            return;
        const nodeBtn = target.closest('[data-marco-node]');
        const nextHover = nodeBtn?.dataset.marcoNode ?? null;
        if (nextHover === hoverNodeId)
            return;
        setHoverNodeId(nextHover);
        if (!nextHover)
            return;
        const nodeView = findMarcoNodeView(buildRenderModel(nextHover).nodes, nextHover);
        if (!nodeView)
            return;
        uiEvents.emit(UIEventType.SHOW_TOOLTIP, {
            data: { kind: 'marco', data: buildMarcoTooltipPayload(nodeView) },
            x: event.clientX,
            y: event.clientY,
        });
    }, [hoverNodeId]);
    const handleMouseLeave = useCallback((event) => {
        const grid = event.currentTarget.querySelector('[data-marcos-grid]');
        if (grid && !grid.contains(event.relatedTarget)) {
            setHoverNodeId(null);
            uiEvents.emit(UIEventType.HIDE_TOOLTIP, {});
        }
    }, []);
    return {
        treeHtml,
        legendHtml,
        overlayHtml,
        handleClick,
        handleMouseOver,
        handleMouseLeave,
    };
}
