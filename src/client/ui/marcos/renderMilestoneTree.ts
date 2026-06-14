import {
  MARCO_BRANCH_LABELS,
  MARCO_TREE_LAYOUT,
  MARCO_TREE_NODES,
  getMarcoTreeEdges,
  isMarcoBranchStarter,
  normalizeRamificacao,
  resolveBranchMembraneEdges,
  type MarcoRamificacaoId,
  type MarcoTreeBranch,
} from '../../../shared/progression/milestoneTreeCatalog.js';
import { buildMarcoNodeProgressionTooltip } from '../../../shared/progression/progressionTooltipContent.js';
import { renderProgressionTooltipAttrs } from '../tooltip/progressionTooltipAttrs.js';
import {
  formatMarcoActiveXpLabel,
  resolveMarcoProgressPercent,
} from '../../../shared/progression/marcoProgression.js';
import {
  type MarcoNodeView,
  resolveHighlightedEdges,
  resolvePrerequisitePath,
} from '../../../shared/progression/milestoneTreeState.js';

export type MarcoTreeRenderModel = {
  readonly nodes: readonly MarcoNodeView[];
  readonly selectedNodeId: string | null;
  readonly hoverNodeId: string | null;
  readonly ramificacaoSelecionada: MarcoRamificacaoId | null;
  readonly trilhaTravada: boolean;
};

const BRANCH_ORDER: readonly MarcoTreeBranch[] = ['fluxo', 'resiliencia', 'precisao'];

function resolvePreviewRamificacao(model: MarcoTreeRenderModel): MarcoRamificacaoId | null {
  if (!model.hoverNodeId) return null;
  const hoverNode = MARCO_TREE_NODES.find((n) => n.id === model.hoverNodeId);
  if (!hoverNode) return null;

  if (
    model.ramificacaoSelecionada &&
    hoverNode.branch !== model.ramificacaoSelecionada &&
    isMarcoBranchStarter(model.hoverNodeId)
  ) {
    return hoverNode.branch;
  }

  if (model.ramificacaoSelecionada && hoverNode.branch === model.ramificacaoSelecionada) {
    return model.ramificacaoSelecionada;
  }

  if (!model.ramificacaoSelecionada && isMarcoBranchStarter(model.hoverNodeId)) {
    return hoverNode.branch;
  }

  return null;
}

function resolveEdgeSets(model: MarcoTreeRenderModel): {
  membrane: ReadonlySet<string>;
  preview: ReadonlySet<string>;
} {
  const membrane = model.ramificacaoSelecionada
    ? resolveBranchMembraneEdges(model.ramificacaoSelecionada)
    : new Set<string>();

  const previewRamificacao = resolvePreviewRamificacao(model);
  let preview = new Set<string>();

  if (previewRamificacao && previewRamificacao !== model.ramificacaoSelecionada) {
    preview = new Set(resolveBranchMembraneEdges(previewRamificacao));
  } else if (model.hoverNodeId && model.ramificacaoSelecionada) {
    preview = new Set(resolveHighlightedEdges(resolvePrerequisitePath(model.hoverNodeId)));
  }

  return { membrane, preview };
}

function edgeClass(
  key: string,
  membrane: ReadonlySet<string>,
  preview: ReadonlySet<string>,
): string {
  if (membrane.has(key)) return 'marcos-grid-edge marcos-grid-edge--membrane';
  if (preview.has(key)) return 'marcos-grid-edge marcos-grid-edge--preview';
  return 'marcos-grid-edge';
}

/** SVG de membranas verticais por coluna da grade 3×5. */
export function renderMarcoGridMembranes(model: MarcoTreeRenderModel): string {
  const { membrane, preview } = resolveEdgeSets(model);
  const cols = MARCO_TREE_LAYOUT.cols;
  const rows = MARCO_TREE_LAYOUT.rows;

  const lines = getMarcoTreeEdges().map(([from, to]) => {
    const fromNode = MARCO_TREE_NODES.find((n) => n.id === from);
    const toNode = MARCO_TREE_NODES.find((n) => n.id === to);
    if (!fromNode || !toNode) return '';
    if (fromNode.layout.col !== toNode.layout.col) return '';

    const col = fromNode.layout.col;
    const xPct = ((col + 0.5) / cols) * 100;
    const y1Pct = ((fromNode.layout.row + 0.72) / rows) * 100;
    const y2Pct = ((toNode.layout.row + 0.28) / rows) * 100;
    const key = `${from}->${to}`;

    return `<line class="${edgeClass(key, membrane, preview)}" x1="${xPct}%" y1="${y1Pct}%" x2="${xPct}%" y2="${y2Pct}%" />`;
  });

  return `
    <svg class="marcos-grid-membranes" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      ${lines.join('')}
    </svg>
  `;
}

export function renderMarcoGridHeaders(ramificacao: MarcoRamificacaoId | null): string {
  return BRANCH_ORDER.map((branch) => {
    const isActive = ramificacao === branch;
    const isDimmed = ramificacao !== null && !isActive;
    return `
      <span class="marcos-grid-header marcos-grid-header--${branch}${isActive ? ' marcos-grid-header--active' : ''}${isDimmed ? ' marcos-grid-header--dimmed' : ''}">
        ${MARCO_BRANCH_LABELS[branch]}
      </span>
    `;
  }).join('');
}

export function renderMarcoGridNodes(model: MarcoTreeRenderModel): string {
  const sorted = [...model.nodes].sort(
    (a, b) => a.def.layout.row - b.def.layout.row || a.def.layout.col - b.def.layout.col,
  );

  return sorted
    .map((nodeView) => {
      const { def, status, isDimmedBranch, isActiveBranch, progressionLevel, effectiveProgressionLevel } =
        nodeView;
      const isSelected = model.selectedNodeId === def.id;
      const isBranchStarter = isMarcoBranchStarter(def.id);
      const tierLevel = def.layout.row + 1;
      const displayLevel = status === 'active' ? effectiveProgressionLevel || progressionLevel : tierLevel;
      const isHovered = model.hoverNodeId === def.id;
      const isFreeChoiceStarter =
        isBranchStarter && !model.ramificacaoSelecionada && !model.trilhaTravada;

      const statusClass =
        status === 'active'
          ? 'marcos-node--active'
          : status === 'available'
            ? 'marcos-node--available'
            : 'marcos-node--locked';

      const icon = status === 'locked' && !isDimmedBranch ? '🔒' : status === 'active' ? '◆' : '○';
      const bonus = def.shortBonus ?? (def.speedFlat !== undefined ? `+${def.speedFlat}` : '');

      const levelLine =
        status === 'active'
          ? `<span class="marcos-node__xp">${formatMarcoActiveXpLabel(
              nodeView.progressionLevel,
              nodeView.progressionXp,
              nodeView.nextLevelThreshold,
              {
                effectiveLevel: nodeView.effectiveProgressionLevel,
              },
            )}</span>`
          : `<span class="marcos-node__level">Nv.${displayLevel}</span>`;

      return `
        <button
          type="button"
          class="marcos-node marcos-node--grid ${statusClass} marcos-node--${def.branch}${isSelected ? ' marcos-node--selected' : ''}${isDimmedBranch ? ' marcos-node--dimmed-branch' : ''}${isActiveBranch ? ' marcos-node--active-branch' : ''}${isFreeChoiceStarter ? ' marcos-node--branch-pick' : ''}${isFreeChoiceStarter && isHovered ? ' marcos-node--branch-pick-hover' : ''}"
          data-marco-node="${def.id}"
          style="grid-column:${def.layout.col + 1};grid-row:${def.layout.row + 1}"
          aria-pressed="${isSelected}"
        >
          ${levelLine}
          <span class="marcos-node__icon" aria-hidden="true">${icon}</span>
          <span class="marcos-node__name">${def.name}</span>
          ${bonus ? `<span class="marcos-node__bonus">${bonus}</span>` : ''}
          ${renderMarcoNodeProgressBlock(nodeView)}
        </button>
      `;
    })
    .join('');
}

/** Barra fina de XP — somente em nós ativos com progressão pendente. */
export function renderMarcoNodeProgressBlock(nodeView: MarcoNodeView): string {
  if (nodeView.status !== 'active' || nodeView.nextLevelThreshold <= 0) return '';

  const pct = resolveMarcoProgressPercent(nodeView.progressionXp, nodeView.nextLevelThreshold);
  const progressionAttrs = renderProgressionTooltipAttrs(
    buildMarcoNodeProgressionTooltip(nodeView),
  );

  return `
    <div
      class="marcos-node__progress"
      data-marco-progress="${nodeView.def.id}"
      role="progressbar"
      ${progressionAttrs}
      aria-valuenow="${nodeView.progressionXp}"
      aria-valuemin="0"
      aria-valuemax="${nodeView.nextLevelThreshold}"
      aria-label="Progresso de XP"
    >
      <div class="marcos-node__progress-fill" style="width:${pct}%"></div>
    </div>
  `;
}

export function resolveMarcoProgressPatch(nodeView: MarcoNodeView): {
  readonly xpLabel: string;
  readonly fillPercent: number;
  readonly showBar: boolean;
} {
  const showBar = nodeView.status === 'active' && nodeView.nextLevelThreshold > 0;
  return {
    xpLabel: formatMarcoActiveXpLabel(
      nodeView.progressionLevel,
      nodeView.progressionXp,
      nodeView.nextLevelThreshold,
      { effectiveLevel: nodeView.effectiveProgressionLevel },
    ),
    fillPercent: resolveMarcoProgressPercent(nodeView.progressionXp, nodeView.nextLevelThreshold),
    showBar,
  };
}

export function renderMarcoGrid(model: MarcoTreeRenderModel): string {
  return `
    <div class="marcos-grid" data-marcos-grid>
      <div class="marcos-grid__headers">
        ${renderMarcoGridHeaders(model.ramificacaoSelecionada)}
      </div>
      <div class="marcos-grid__body">
        ${renderMarcoGridMembranes(model)}
        <div class="marcos-grid__cells" data-marcos-nodes style="--marcos-cols:${MARCO_TREE_LAYOUT.cols};--marcos-rows:${MARCO_TREE_LAYOUT.rows}">
          ${renderMarcoGridNodes(model)}
        </div>
      </div>
    </div>
  `;
}

export function findMarcoNodeView(
  nodes: readonly MarcoNodeView[], 
  nodeId: string | null,
): MarcoNodeView | null {
  if (!nodeId) return null;
  return nodes.find((entry) => entry.def.id === nodeId) ?? null;
}

export function renderMarcoBranchConfirmOverlay(
  nodeView: MarcoNodeView,
): string {
  const branchLabel = MARCO_BRANCH_LABELS[nodeView.def.branch];
  return `
    <div class="marcos-confirm" data-marcos-confirm role="dialog" aria-modal="true" aria-labelledby="marcos-confirm-title">
      <div class="marcos-confirm__backdrop" data-action="cancel-branch"></div>
      <div class="marcos-confirm__card">
        <h3 class="marcos-confirm__title" id="marcos-confirm-title">Confirmar Trilha</h3>
        <p class="marcos-confirm__text">
          Travar a trilha <strong>${branchLabel}</strong> com
          <strong>${nodeView.def.name}</strong>?
        </p>
        <p class="marcos-confirm__hint">Esta escolha não pode ser alterada aqui. Fale com o Mestre de Trilhas para resetar.</p>
        <div class="marcos-confirm__actions">
          <button type="button" class="marcos-confirm__btn marcos-confirm__btn--yes" data-action="confirm-branch" data-marco-id="${nodeView.def.id}">Confirmar</button>
          <button type="button" class="marcos-confirm__btn marcos-confirm__btn--no" data-action="cancel-branch">Cancelar</button>
        </div>
      </div>
    </div>
  `;
}

/** @deprecated Use renderMarcoGrid */
export function renderMarcoTreeEdges(model: MarcoTreeRenderModel): string {
  return renderMarcoGridMembranes(model);
}

/** @deprecated Use renderMarcoGridNodes */
export function renderMarcoTreeNodes(model: MarcoTreeRenderModel): string {
  return renderMarcoGridNodes(model);
}

export function buildRenderModelRamificacao(raw: string | null): MarcoRamificacaoId | null {
  return normalizeRamificacao(raw);
}
