import { getActionDispatcher } from '../../ActionDispatcher.js';
import { getDataStore } from '../../economy/dataStoreAccess.js';
import {
  buildMarcoTreeView,
  buildMarcoTooltipPayload,
  canChooseMarco,
  canSelectBranchStarter,
  hasConfirmedMarcoTrail,
  resolveMarcoChooseBlockedMessage,
  resolveRamificacaoFromContext,
  type MarcoTreePlayerContext,
} from '../../../shared/progression/milestoneTreeState.js';
import { isMarcoBranchStarter } from '../../../shared/progression/milestoneTreeCatalog.js';
import { alertSystem } from '../../ui/alertSystem.js';
import { findMarcoNodeView } from '../../ui/marcos/renderMilestoneTree.js';
import { uiEvents, UIEventType } from '../../ui/uiEvents.js';
import type { MarcoTreeRenderModel } from '../../ui/marcos/renderMilestoneTree.js';

function resolveMarcosPanelPlayerLevel(): number {
  const level = getDataStore().getCharacterLevel().level;
  if (Number.isFinite(level) && level > 0) return Math.floor(level);
  return 1;
}

export function buildMarcosPlayerContext(): MarcoTreePlayerContext {
  const marcosState = getDataStore().getMarcosState();
  return {
    activeMarcos: marcosState.activeMarcos,
    flowSpeedBase: marcosState.flowSpeedBase,
    milestoneTotalProgress: marcosState.milestoneTotalProgress,
    playerLevel: resolveMarcosPanelPlayerLevel(),
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
  const ctx = buildMarcosPlayerContext();
  return {
    nodes: buildMarcoTreeView(ctx),
    selectedNodeId,
    hoverNodeId,
    ramificacaoSelecionada: resolveRamificacaoFromContext(marcosState.ramificacaoSelecionada),
    trilhaTravada: marcosState.trilhaTravada,
    playerLevel: ctx.playerLevel,
  };
}

export type MarcosClickResult = {
  readonly refreshFull: boolean;
  /** Intent online aguardando ACK — UI espera e mostra feedback. */
  readonly pendingIntentId: string | null;
};

/**
 * Clique na árvore:
 * - Sem trilha: clique no starter Nv.10 → ativa na hora (SELECT_MARCO_BRANCH).
 * - Com trilha: clique em nó disponível → CHOOSE_MARCO.
 */
export function handleMarcosPanelClick(target: HTMLElement): MarcosClickResult {
  const nodeBtn = target.closest<HTMLElement>('[data-marco-node]');
  if (!nodeBtn?.dataset.marcoNode) {
    return { refreshFull: false, pendingIntentId: null };
  }

  const nodeId = nodeBtn.dataset.marcoNode;
  const ctx = buildMarcosPlayerContext();

  // Player novo / sem trilha: um clique ativa uma das 3 (mutuamente exclusivas).
  if (canSelectBranchStarter(nodeId, ctx)) {
    const result = getActionDispatcher().dispatch({
      type: 'SELECT_MARCO_BRANCH',
      payload: { starterNodeId: nodeId },
    });
    if (!result.ok) {
      const blocked = resolveMarcoChooseBlockedMessage(nodeId, ctx);
      alertSystem(blocked ?? result.reason ?? 'Não foi possível ativar esta trilha.');
      return { refreshFull: false, pendingIntentId: null };
    }
    if (result.status === 'pending') {
      return { refreshFull: false, pendingIntentId: result.intentId };
    }
    alertSystem('Trilha Marcos ativada.');
    return { refreshFull: true, pendingIntentId: null };
  }

  if (isMarcoBranchStarter(nodeId) && !hasConfirmedMarcoTrail(ctx)) {
    const blocked = resolveMarcoChooseBlockedMessage(nodeId, ctx);
    if (blocked) alertSystem(blocked);
    return { refreshFull: false, pendingIntentId: null };
  }

  if (canChooseMarco(nodeId, ctx)) {
    const result = getActionDispatcher().dispatch({
      type: 'CHOOSE_MARCO',
      payload: { nodeId },
    });
    if (result.ok && result.status === 'applied') {
      alertSystem('Habilidade Marcos ativada.');
      return { refreshFull: true, pendingIntentId: null };
    }
    if (result.ok && result.status === 'pending') {
      return { refreshFull: false, pendingIntentId: result.intentId };
    }
    const blocked = resolveMarcoChooseBlockedMessage(nodeId, ctx);
    if (blocked) alertSystem(blocked);
    else if (!result.ok) alertSystem(result.reason);
    return { refreshFull: false, pendingIntentId: null };
  }

  const blocked = resolveMarcoChooseBlockedMessage(nodeId, ctx);
  if (blocked) alertSystem(blocked);
  return { refreshFull: false, pendingIntentId: null };
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
