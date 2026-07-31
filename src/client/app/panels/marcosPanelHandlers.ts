import { getActionDispatcher } from '../../ActionDispatcher.js';
import { getDataStore } from '../../economy/dataStoreAccess.js';
import { getPlayerEquipmentStore } from '../../ui/equipment/playerEquipmentStore.js';
import { getPlayerProfileStore } from '../../ui/character/playerProfileStore.js';
import {
  buildMarcoTreeView,
  buildMarcoTooltipPayload,
  canChooseMarco,
  canSelectBranchStarter,
  hasConfirmedMarcoTrail,
  resolveMarcoChooseBlockedMessage,
  resolveRamificacaoFromContext,
  sanitizeActiveMarcosForTrail,
  type MarcoTreePlayerContext,
} from '../../../shared/progression/milestoneTreeState.js';
import {
  getMarcoTreeNode,
  MARCO_BRANCH_LABELS,
  MARCO_BRANCH_SHORT_LABELS,
  resolveStarterFromRamificacao,
  type MarcoRamificacaoId,
  type MarcoTreeBranch,
} from '../../../shared/progression/milestoneTreeCatalog.js';
import { alertSystem } from '../../ui/alertSystem.js';
import { findMarcoNodeView } from '../../ui/marcos/renderMilestoneTree.js';
import { uiEvents, UIEventType } from '../../ui/uiEvents.js';
import type { MarcoTreeRenderModel } from '../../ui/marcos/renderMilestoneTree.js';

export const MARCO_TRAIL_PICK_ORDER: readonly MarcoTreeBranch[] = [
  'fluxo',
  'resiliencia',
  'precisao',
];

function resolveMarcosPanelPlayerLevel(): number {
  const fromData = getDataStore().getCharacterLevel().level;
  let fromEquip = 0;
  let fromProfile = 0;
  try {
    fromEquip = getPlayerEquipmentStore().getSnapshot().level;
  } catch {
    /* store ainda não montado */
  }
  try {
    fromProfile = getPlayerProfileStore().getSnapshot().level;
  } catch {
    /* store ainda não montado */
  }
  const level = Math.max(
    Number.isFinite(fromData) ? fromData : 0,
    Number.isFinite(fromEquip) ? fromEquip : 0,
    Number.isFinite(fromProfile) ? fromProfile : 0,
  );
  return level > 0 ? Math.floor(level) : 1;
}

export function buildMarcosPlayerContext(): MarcoTreePlayerContext {
  const marcosState = getDataStore().getMarcosState();
  const ramificacaoSelecionada = resolveRamificacaoFromContext(marcosState.ramificacaoSelecionada);
  return {
    activeMarcos: sanitizeActiveMarcosForTrail(
      marcosState.activeMarcos,
      ramificacaoSelecionada,
      marcosState.trilhaTravada,
    ),
    flowSpeedBase: marcosState.flowSpeedBase,
    milestoneTotalProgress: marcosState.milestoneTotalProgress,
    playerLevel: resolveMarcosPanelPlayerLevel(),
    ramificacaoSelecionada,
    trilhaTravada: marcosState.trilhaTravada,
    nodeProgression: marcosState.nodeProgression,
  };
}

export function buildMarcosRenderModel(
  hoverNodeId: string | null,
  selectedNodeId: string | null = null,
  previewBranch: MarcoRamificacaoId | null = null,
): MarcoTreeRenderModel {
  const marcosState = getDataStore().getMarcosState();
  const ctx = buildMarcosPlayerContext();
  const selectedForRender =
    selectedNodeId
    ?? (previewBranch && !marcosState.trilhaTravada
      ? resolveStarterFromRamificacao(previewBranch)
      : null);
  return {
    nodes: buildMarcoTreeView(ctx),
    selectedNodeId: selectedForRender,
    hoverNodeId,
    ramificacaoSelecionada: resolveRamificacaoFromContext(marcosState.ramificacaoSelecionada),
    trilhaTravada: marcosState.trilhaTravada,
    playerLevel: ctx.playerLevel,
  };
}

export type MarcosClickResult = {
  readonly refreshFull: boolean;
  readonly pendingIntentId: string | null;
};

export type MarcosAbilityPick =
  | { readonly kind: 'ability'; readonly nodeId: string; readonly label: string }
  | { readonly kind: 'blocked'; readonly message: string }
  | { readonly kind: 'none' };

export function resolveMarcosAbilityPick(target: HTMLElement): MarcosAbilityPick {
  const nodeBtn = target.closest<HTMLElement>('[data-marco-node]');
  if (!nodeBtn?.dataset.marcoNode) return { kind: 'none' };

  const nodeId = nodeBtn.dataset.marcoNode;
  const ctx = buildMarcosPlayerContext();
  const label = getMarcoTreeNode(nodeId)?.name ?? nodeId;

  // Pré-trilha: nós da grade não escolhem trilha — só os botões Agilidade/Defesa/Crítico.
  if (!hasConfirmedMarcoTrail(ctx)) {
    return { kind: 'none' };
  }

  if (canChooseMarco(nodeId, ctx)) {
    return { kind: 'ability', nodeId, label };
  }

  const blocked = resolveMarcoChooseBlockedMessage(nodeId, ctx);
  if (blocked) return { kind: 'blocked', message: blocked };
  return { kind: 'none' };
}

/** Trava a trilha (Agilidade / Defesa / Crítico) sem obter o 1º nível. */
export function activateMarcosTrail(branch: MarcoRamificacaoId): MarcosClickResult {
  const starterNodeId = resolveStarterFromRamificacao(branch);
  const ctx = buildMarcosPlayerContext();

  if (!canSelectBranchStarter(starterNodeId, ctx)) {
    const blocked = resolveMarcoChooseBlockedMessage(starterNodeId, ctx);
    alertSystem(blocked ?? 'Não foi possível ativar esta trilha.');
    return { refreshFull: false, pendingIntentId: null };
  }

  const result = getActionDispatcher().dispatch({
    type: 'SELECT_MARCO_BRANCH',
    payload: { starterNodeId },
  });
  if (!result.ok) {
    alertSystem(result.reason ?? 'Não foi possível ativar esta trilha.');
    return { refreshFull: false, pendingIntentId: null };
  }
  if (result.status === 'pending') {
    return { refreshFull: false, pendingIntentId: result.intentId };
  }
  alertSystem(`${MARCO_BRANCH_LABELS[branch]} ativada · 1º nível selecionado.`);
  return { refreshFull: true, pendingIntentId: null };
}

/** Obtém um nó disponível (incluindo o starter Nv.1 após a trilha travada). */
export function obtainMarcosAbility(nodeId: string): MarcosClickResult {
  const ctx = buildMarcosPlayerContext();
  if (!canChooseMarco(nodeId, ctx)) {
    const blocked = resolveMarcoChooseBlockedMessage(nodeId, ctx);
    if (blocked) alertSystem(blocked);
    return { refreshFull: false, pendingIntentId: null };
  }

  const result = getActionDispatcher().dispatch({
    type: 'CHOOSE_MARCO',
    payload: { nodeId },
  });
  if (result.ok && result.status === 'applied') {
    alertSystem('Habilidade Marcos obtida.');
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

export function listMarcosTrailOptions(playerLevel: number): readonly {
  readonly branch: MarcoTreeBranch;
  readonly shortLabel: string;
  readonly fullLabel: string;
  readonly starterId: string;
  readonly canActivate: boolean;
}[] {
  const ctx = buildMarcosPlayerContext();
  return MARCO_TRAIL_PICK_ORDER.map((branch) => {
    const starterId = resolveStarterFromRamificacao(branch);
    return {
      branch,
      shortLabel: MARCO_BRANCH_SHORT_LABELS[branch],
      fullLabel: MARCO_BRANCH_LABELS[branch],
      starterId,
      canActivate: canSelectBranchStarter(starterId, { ...ctx, playerLevel }),
    };
  });
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
