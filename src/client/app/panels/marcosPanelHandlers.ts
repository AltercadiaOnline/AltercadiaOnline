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
  selectedNodeId: string | null = null,
): MarcoTreeRenderModel {
  const marcosState = getDataStore().getMarcosState();
  return {
    nodes: buildMarcoTreeView(buildMarcosPlayerContext()),
    selectedNodeId,
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

  const nodeBtn = target.closest<HTMLElement>('[data-marco-node]');
  if (nodeBtn?.dataset.marcoNode) {
    const nodeId = nodeBtn.dataset.marcoNode;
    const ctx = buildMarcosPlayerContext();

    if (canSelectBranchStarter(nodeId, ctx)) {
      return { pendingBranchNodeId: nodeId, refreshFull: true };
    }

    if (pendingBranchNodeId) {
      return { pendingBranchNodeId, refreshFull: false };
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
        alertSystem('Habilidade Marcos ativada.');
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

  if (pendingBranchNodeId) {
    return { pendingBranchNodeId, refreshFull: false };
  }

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
