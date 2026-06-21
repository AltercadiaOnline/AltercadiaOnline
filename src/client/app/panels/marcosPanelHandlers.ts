import { getActionDispatcher } from '../../ActionDispatcher.js';
import { getDataStore } from '../../economy/economyLayer.js';
import { getPlayerEquipmentStore } from '../../ui/equipment/playerEquipmentStore.js';
import {
  buildMarcoTreeView,
  buildMarcoTooltipPayload,
  canChooseMarco,
  canSelectBranchStarter,
  resolveMarcoChooseBlockedMessage,
  resolveRamificacaoFromContext,
  type MarcoTreePlayerContext,
} from '../../../shared/progression/milestoneTreeState.js';
import { isMarcoBranchStarter } from '../../../shared/progression/milestoneTreeCatalog.js';
import { alertSystem } from '../../ui/alertSystem.js';
import { findMarcoNodeView } from '../../ui/marcos/renderMilestoneTree.js';
import { uiEvents, UIEventType } from '../../ui/uiEvents.js';
import type { MarcoTreeRenderModel } from '../../ui/marcos/renderMilestoneTree.js';

export function buildMarcosPlayerContext(): MarcoTreePlayerContext {
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

export function buildMarcosRenderModel(
  hoverNodeId: string | null,
): MarcoTreeRenderModel {
  const marcosState = getDataStore().getMarcosState();
  return {
    nodes: buildMarcoTreeView(buildMarcosPlayerContext()),
    selectedNodeId: null,
    hoverNodeId,
    ramificacaoSelecionada: resolveRamificacaoFromContext(marcosState.ramificacaoSelecionada),
    trilhaTravada: marcosState.trilhaTravada,
  };
}

export type MarcosClickResult = {
  readonly pendingBranchNodeId: string | null;
  readonly refreshFull: boolean;
};

export function handleMarcosPanelClick(
  target: HTMLElement,
  pendingBranchNodeId: string | null,
): MarcosClickResult {
  if (target.closest('[data-action="cancel-branch"]')) {
    return { pendingBranchNodeId: null, refreshFull: true };
  }

  const confirmBtn = target.closest<HTMLElement>('[data-action="confirm-branch"]');
  if (confirmBtn?.dataset.marcoId) {
    const dispatcher = getActionDispatcher();
    const result = dispatcher.dispatch({
      type: 'SELECT_MARCO_BRANCH',
      payload: { starterNodeId: confirmBtn.dataset.marcoId },
    });
    if (result.ok && (result.status === 'applied' || result.status === 'pending')) {
      return { pendingBranchNodeId: null, refreshFull: true };
    }
    const ctx = buildMarcosPlayerContext();
    const blocked = resolveMarcoChooseBlockedMessage(confirmBtn.dataset.marcoId, ctx);
    if (blocked) alertSystem(blocked);
    else if (!result.ok) alertSystem(result.reason);
    return { pendingBranchNodeId, refreshFull: false };
  }

  if (pendingBranchNodeId) {
    return { pendingBranchNodeId, refreshFull: false };
  }

  const nodeBtn = target.closest<HTMLElement>('[data-marco-node]');
  if (!nodeBtn?.dataset.marcoNode) {
    return { pendingBranchNodeId, refreshFull: false };
  }

  const nodeId = nodeBtn.dataset.marcoNode;
  const ctx = buildMarcosPlayerContext();

  if (canSelectBranchStarter(nodeId, ctx)) {
    return { pendingBranchNodeId: nodeId, refreshFull: true };
  }

  if (isMarcoBranchStarter(nodeId) && !ctx.ramificacaoSelecionada) {
    const blocked = resolveMarcoChooseBlockedMessage(nodeId, ctx);
    if (blocked) {
      alertSystem(blocked);
      return { pendingBranchNodeId, refreshFull: false };
    }
  }

  if (canChooseMarco(nodeId, ctx)) {
    const result = getActionDispatcher().dispatch({
      type: 'CHOOSE_MARCO',
      payload: { nodeId },
    });
    if (result.ok && result.status === 'applied') {
      return { pendingBranchNodeId, refreshFull: true };
    }
    const blocked = resolveMarcoChooseBlockedMessage(nodeId, ctx);
    if (blocked) alertSystem(blocked);
    else if (!result.ok) alertSystem(result.reason);
    return { pendingBranchNodeId, refreshFull: false };
  }

  const blocked = resolveMarcoChooseBlockedMessage(nodeId, ctx);
  if (blocked) alertSystem(blocked);
  return { pendingBranchNodeId, refreshFull: false };
}

export function showMarcoNodeTooltip(target: HTMLElement, clientX: number, clientY: number): void {
  const nodeBtn = target.closest<HTMLElement>('[data-marco-node]');
  if (!nodeBtn?.dataset.marcoNode) return;
  if (target.closest('[data-progression-tooltip]')) return;

  const model = buildMarcosRenderModel(nodeBtn.dataset.marcoNode);
  const nodeView = findMarcoNodeView(model.nodes, nodeBtn.dataset.marcoNode);
  if (!nodeView) return;

  uiEvents.emit(UIEventType.SHOW_TOOLTIP, {
    data: { kind: 'marco', data: buildMarcoTooltipPayload(nodeView) },
    x: clientX,
    y: clientY,
  });
}
