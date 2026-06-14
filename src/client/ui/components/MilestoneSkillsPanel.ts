import { BaseUIComponent } from '../UIComponent.js';
import { windowManager } from '../WindowManager.js';
import { uiEvents, UIEventType } from '../uiEvents.js';
import { getActionDispatcher } from '../../ActionDispatcher.js';
import { getDataStore } from '../../economy/economyLayer.js';
import { getPlayerEquipmentStore } from '../equipment/playerEquipmentStore.js';
import { MARCO_ABILITY_LEVEL_MIN_PLAYER_LEVEL } from '../../../shared/progression/marcoProgression.js';
import { buildMarcoNodeProgressionTooltip } from '../../../shared/progression/progressionTooltipContent.js';
import { patchProgressionTooltipAttrs } from '../tooltip/progressionTooltipAttrs.js';
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
import { alertSystem } from '../alertSystem.js';
import type { MarcosStateSnapshot } from '../../../shared/playerDataSnapshots.js';
import {
  findMarcoNodeView,
  renderMarcoBranchConfirmOverlay,
  renderMarcoGrid,
  renderMarcoGridMembranes,
  renderMarcoGridNodes,
  resolveMarcoProgressPatch,
  type MarcoTreeRenderModel,
} from '../marcos/renderMilestoneTree.js';

/** Painel interativo — grade 3×5 de trilhas Marcos. */
export class MilestoneSkillsPanel extends BaseUIComponent {
  private hoverNodeId: string | null = null;
  private pendingBranchNodeId: string | null = null;
  private unsubMarcos: (() => void) | null = null;
  private marcosStructuralKey: string | null = null;

  private readonly dataStore = getDataStore();
  private readonly dispatcher = getActionDispatcher();

  constructor() {
    super({
      id: 'marcos',
      rootClassName: 'ui-panel ui-panel--marcos ui-panel--movable',
    });
  }

  protected override shouldUseDynamicLayout(): boolean {
    return true;
  }

  protected override getDynamicLayoutOptions() {
    return {
      fitRootSelector: '[data-hud-fit-root]',
      secondarySelector: '[data-hud-fit-secondary]',
      minVisibleItems: 99,
    };
  }

  protected override onOpen(): void {
    this.unsubMarcos = this.dataStore.subscribe('marcosState', (state) => {
      if (this.pendingBranchNodeId && state.trilhaTravada) {
        this.pendingBranchNodeId = null;
      }
      if (!this.isOpen()) return;

      const nextKey = this.buildMarcosStructuralKey(state);
      if (nextKey !== this.marcosStructuralKey) {
        this.marcosStructuralKey = nextKey;
        this.refreshTree();
        return;
      }

      this.syncMarcoProgressBars();
    });
    this.marcosStructuralKey = this.buildMarcosStructuralKey(this.dataStore.getMarcosState());
    this.refreshTree();
  }

  protected override onClose(): void {
    this.unsubMarcos?.();
    this.unsubMarcos = null;
    this.hoverNodeId = null;
    this.pendingBranchNodeId = null;
    this.marcosStructuralKey = null;
    uiEvents.emit(UIEventType.HIDE_TOOLTIP, {});
  }

  createTemplate(): string {
    const model = this.buildRenderModel();
    const pendingNode = findMarcoNodeView(model.nodes, this.pendingBranchNodeId);

    return `
      <header class="ui-panel__header" data-panel-drag-handle>
        <div>
          <span class="marcos-panel__tag">PROGRESSÃO // MARCOS</span>
          <h2 class="ui-panel__title">Habilidade Marcos</h2>
        </div>
        <button type="button" class="ui-panel__close" data-action="close" aria-label="Fechar Habilidade Marcos">×</button>
      </header>
      <div class="ui-panel__body marcos-panel__body" data-hud-fit-root>
        <div class="marcos-panel__tree-area">
          ${renderMarcoGrid(model)}
          <p class="marcos-panel__legend" data-hud-fit-secondary>
            <span class="marcos-legend marcos-legend--active">◆ Ativo</span>
            <span class="marcos-legend marcos-legend--available">○ Disponível</span>
            <span class="marcos-legend marcos-legend--locked">🔒 Bloqueado</span>
            <span class="marcos-legend marcos-legend--gates">Nv. habilidade 1–5: personagem ${MARCO_ABILITY_LEVEL_MIN_PLAYER_LEVEL.join(' / ')}</span>
          </p>
        </div>
        ${pendingNode ? renderMarcoBranchConfirmOverlay(pendingNode) : ''}
      </div>
    `;
  }

  protected override bindEvents(): void {
    this.root?.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;

      if (target.dataset.action === 'close') {
        windowManager.close('marcos');
        return;
      }

      if (target.closest('[data-action="cancel-branch"]')) {
        this.pendingBranchNodeId = null;
        this.refreshTree();
        return;
      }

      const confirmBtn = target.closest<HTMLElement>('[data-action="confirm-branch"]');
      if (confirmBtn?.dataset.marcoId) {
        const result = this.dispatcher.dispatch({
          type: 'SELECT_MARCO_BRANCH',
          payload: { starterNodeId: confirmBtn.dataset.marcoId },
        });
        if (result.ok && result.status === 'applied') {
          this.pendingBranchNodeId = null;
          this.refreshTree();
        } else if (result.ok && result.status === 'pending') {
          this.refreshTree();
        } else {
          const ctx = this.buildPlayerContext();
          const blocked = resolveMarcoChooseBlockedMessage(confirmBtn.dataset.marcoId, ctx);
          if (blocked) alertSystem(blocked);
          else if (!result.ok) alertSystem(result.reason);
        }
        return;
      }

      if (this.pendingBranchNodeId) return;

      const nodeBtn = target.closest<HTMLElement>('[data-marco-node]');
      if (!nodeBtn?.dataset.marcoNode) return;

      const nodeId = nodeBtn.dataset.marcoNode;
      const ctx = this.buildPlayerContext();

      if (canSelectBranchStarter(nodeId, ctx)) {
        this.pendingBranchNodeId = nodeId;
        this.refreshTree();
        return;
      }

      if (isMarcoBranchStarter(nodeId) && !ctx.ramificacaoSelecionada) {
        const blocked = resolveMarcoChooseBlockedMessage(nodeId, ctx);
        if (blocked) {
          alertSystem(blocked);
          return;
        }
      }

      if (canChooseMarco(nodeId, ctx)) {
        const result = this.dispatcher.dispatch({ type: 'CHOOSE_MARCO', payload: { nodeId } });
        if (result.ok && result.status === 'applied') {
          this.refreshTree();
          return;
        }
        const blocked = resolveMarcoChooseBlockedMessage(nodeId, ctx);
        if (blocked) alertSystem(blocked);
        else if (!result.ok) alertSystem(result.reason);
        return;
      }

      const blocked = resolveMarcoChooseBlockedMessage(nodeId, ctx);
      if (blocked) alertSystem(blocked);
    });

    this.root?.addEventListener('mouseover', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (target.closest('[data-progression-tooltip]')) return;

      const nodeBtn = target.closest<HTMLElement>('[data-marco-node]');
      const nextHover = nodeBtn?.dataset.marcoNode ?? null;
      if (nextHover === this.hoverNodeId) return;

      this.hoverNodeId = nextHover;
      this.refreshTreeVisuals();

      if (!nextHover) return;
      const model = this.buildRenderModel();
      const nodeView = findMarcoNodeView(model.nodes, nextHover);
      if (!nodeView) return;

      uiEvents.emit(UIEventType.SHOW_TOOLTIP, {
        data: { kind: 'marco', data: buildMarcoTooltipPayload(nodeView) },
        x: event.clientX,
        y: event.clientY,
      });
    });

    this.root?.addEventListener('mouseleave', (event) => {
      if (!(event.target instanceof HTMLElement)) return;
      const grid = this.query<HTMLElement>('[data-marcos-grid]');
      if (grid && !grid.contains(event.relatedTarget as Node)) {
        this.hoverNodeId = null;
        this.refreshTreeVisuals();
        uiEvents.emit(UIEventType.HIDE_TOOLTIP, {});
      }
    });
  }

  private buildPlayerContext(): MarcoTreePlayerContext {
    const marcosState = this.dataStore.getMarcosState();
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

  private buildRenderModel(): MarcoTreeRenderModel {
    const marcosState = this.dataStore.getMarcosState();
    return {
      nodes: buildMarcoTreeView(this.buildPlayerContext()),
      selectedNodeId: null,
      hoverNodeId: this.hoverNodeId,
      ramificacaoSelecionada: resolveRamificacaoFromContext(marcosState.ramificacaoSelecionada),
      trilhaTravada: marcosState.trilhaTravada,
    };
  }

  private refreshTreeVisuals(): void {
    const model = this.buildRenderModel();
    const grid = this.query<HTMLElement>('[data-marcos-grid]');
    if (!grid) return;

    const membraneHost = grid.querySelector('.marcos-grid-membranes');
    if (membraneHost) membraneHost.outerHTML = renderMarcoGridMembranes(model);

    const nodesHost = this.query<HTMLElement>('[data-marcos-nodes]');
    if (nodesHost) nodesHost.innerHTML = renderMarcoGridNodes(model);
  }

  private refreshTree(): void {
    if (!this.isOpen()) return;
    this.render();
  }

  private buildMarcosStructuralKey(state: MarcosStateSnapshot): string {
    return `${state.ramificacaoSelecionada ?? ''}|${state.trilhaTravada}|${state.activeMarcos.join(',')}`;
  }

  /** Atualiza rótulo e barra sem re-render — preserva tween CSS. */
  private syncMarcoProgressBars(): void {
    const model = this.buildRenderModel();

    for (const nodeView of model.nodes) {
      if (nodeView.status !== 'active') continue;

      const nodeBtn = this.query<HTMLElement>(`[data-marco-node="${nodeView.def.id}"]`);
      if (!nodeBtn) continue;

      const patch = resolveMarcoProgressPatch(nodeView);
      const xpEl = nodeBtn.querySelector<HTMLElement>('.marcos-node__xp');
      if (xpEl) xpEl.textContent = patch.xpLabel;

      const progressEl = nodeBtn.querySelector<HTMLElement>(`[data-marco-progress="${nodeView.def.id}"]`);
      const fillEl = progressEl?.querySelector<HTMLElement>('.marcos-node__progress-fill');

      if (patch.showBar) {
        if (!progressEl || !fillEl) {
          this.refreshTreeVisuals();
          return;
        }
        progressEl.setAttribute('aria-valuenow', String(nodeView.progressionXp));
        progressEl.setAttribute('aria-valuemax', String(nodeView.nextLevelThreshold));
        fillEl.style.width = `${patch.fillPercent}%`;
        patchProgressionTooltipAttrs(
          progressEl,
          buildMarcoNodeProgressionTooltip(nodeView),
        );
      } else if (progressEl) {
        progressEl.remove();
      }
    }
  }
}
