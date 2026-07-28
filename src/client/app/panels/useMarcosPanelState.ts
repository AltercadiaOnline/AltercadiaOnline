import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MarcosStateSnapshot } from '../../../shared/playerDataSnapshots.js';
import { MARCO_BRANCH_LABELS } from '../../../shared/progression/milestoneTreeCatalog.js';
import { getActionDispatcher } from '../../ActionDispatcher.js';
import { getDataStore } from '../../economy/dataStoreAccess.js';
import { MARCO_ABILITY_LEVEL_MIN_PLAYER_LEVEL } from '../../../shared/progression/marcoProgression.js';
import {
  buildMarcosRenderModel,
  buildMarcosPlayerContext,
  handleMarcosPanelClick,
  showMarcoNodeTooltip,
} from './marcosPanelHandlers.js';
import {
  findMarcoNodeView,
  renderMarcoGrid,
} from '../../ui/marcos/renderMilestoneTree.js';
import { uiEvents, UIEventType } from '../../ui/uiEvents.js';
import { alertSystem } from '../../ui/alertSystem.js';
import { useActionGatewaySubmit } from './useActionGatewaySubmit.js';

function buildMarcosStructuralKey(state: MarcosStateSnapshot): string {
  return `${state.ramificacaoSelecionada ?? ''}|${state.trilhaTravada}|${state.activeMarcos.join(',')}`;
}

export function useMarcosPanelState() {
  const [pendingBranchNodeId, setPendingBranchNodeId] = useState<string | null>(null);
  const [confirmSuccess, setConfirmSuccess] = useState(false);
  const [progressTick, setProgressTick] = useState(0);
  const treeHostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const unsubLevel = getDataStore().subscribe('characterLevel', () => {
      setProgressTick((tick) => tick + 1);
    });
    return () => unsubLevel();
  }, []);

  useEffect(() => {
    let currentStructuralKey = buildMarcosStructuralKey(getDataStore().getMarcosState());

    const unsub = getDataStore().subscribe('marcosState', (state) => {
      if (pendingBranchNodeId && state.trilhaTravada) {
        setPendingBranchNodeId(null);
        setConfirmSuccess(true);
      }
      const nextKey = buildMarcosStructuralKey(state);
      if (nextKey !== currentStructuralKey) {
        currentStructuralKey = nextKey;
        setProgressTick((tick) => tick + 1);
        return;
      }
      setProgressTick((tick) => tick + 1);
    });
    return () => unsub();
  }, [pendingBranchNodeId]);

  useEffect(() => {
    const state = getDataStore().getMarcosState();
    if (state.trilhaTravada && state.ramificacaoSelecionada) {
      setConfirmSuccess(true);
    }
  }, []);

  // Hover NÃO entra no HTML — regenerar innerHTML no mouseover destruía o <button> no meio do clique.
  const model = buildMarcosRenderModel(null, pendingBranchNodeId);
  const pendingNode = findMarcoNodeView(model.nodes, pendingBranchNodeId);
  const gridHtml = renderMarcoGrid(model);

  const pendingBranchLabel = pendingNode
    ? MARCO_BRANCH_LABELS[pendingNode.def.branch]
    : null;

  const confirmedBranchLabel = model.ramificacaoSelecionada
    ? MARCO_BRANCH_LABELS[model.ramificacaoSelecionada]
    : null;

  const confirmBranchGateway = useActionGatewaySubmit({
    onClick: () => {
      if (!pendingBranchNodeId) return undefined;
      return getActionDispatcher().dispatch({
        type: 'SELECT_MARCO_BRANCH',
        payload: { starterNodeId: pendingBranchNodeId },
      });
    },
    onResolved: () => {
      setConfirmSuccess(true);
      setPendingBranchNodeId(null);
      setProgressTick((tick) => tick + 1);
    },
    onRejected: (reason) => {
      if (reason) alertSystem(reason);
    },
    pendingLabel: 'Confirmando…',
    idleLabel: 'Confirmar trilha',
  });

  const selectPendingBranch = useCallback((nodeId: string | null) => {
    if (getDataStore().getMarcosState().trilhaTravada) return;
    setPendingBranchNodeId(nodeId);
    if (nodeId) setConfirmSuccess(false);
    setProgressTick((tick) => tick + 1);
  }, []);

  // Delegação nativa no host estável — não depende do botão sobreviver ao re-render.
  useEffect(() => {
    const host = treeHostRef.current;
    if (!host) return undefined;

    const onTreeClick = (event: MouseEvent): void => {
      if (confirmBranchGateway.pending) return;
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;

      const result = handleMarcosPanelClick(target, pendingBranchNodeId);
      if (result.pendingBranchNodeId !== pendingBranchNodeId || result.refreshFull) {
        selectPendingBranch(result.pendingBranchNodeId);
      }
    };

    host.addEventListener('click', onTreeClick);
    return () => host.removeEventListener('click', onTreeClick);
  }, [confirmBranchGateway.pending, pendingBranchNodeId, selectPendingBranch]);

  const cancelBranchSelection = useCallback(() => {
    if (confirmBranchGateway.pending) return;
    selectPendingBranch(null);
  }, [confirmBranchGateway.pending, selectPendingBranch]);

  const handleMouseOver = useCallback((event: React.MouseEvent<HTMLElement>) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const nodeBtn = target.closest<HTMLElement>('[data-marco-node]');
    if (!nodeBtn?.dataset.marcoNode) return;
    showMarcoNodeTooltip(target, event.clientX, event.clientY);
  }, []);

  const handleMouseLeave = useCallback((event: React.MouseEvent<HTMLElement>) => {
    const grid = event.currentTarget.querySelector('[data-marcos-grid]');
    if (grid && !grid.contains(event.relatedTarget as Node)) {
      uiEvents.emit(UIEventType.HIDE_TOOLTIP, {});
    }
  }, []);

  useEffect(() => () => {
    uiEvents.emit(UIEventType.HIDE_TOOLTIP, {});
  }, []);

  const confirmBarMode = useMemo(() => {
    if (model.trilhaTravada && confirmedBranchLabel) return 'confirmed' as const;
    const playerLevel = buildMarcosPlayerContext().playerLevel;
    if (playerLevel < MARCO_ABILITY_LEVEL_MIN_PLAYER_LEVEL[0]!) {
      return 'hidden' as const;
    }
    if (pendingBranchNodeId && pendingNode && pendingBranchLabel && !model.trilhaTravada) {
      return 'pending' as const;
    }
    if (!model.trilhaTravada) return 'idle' as const;
    return 'hidden' as const;
  }, [
    confirmedBranchLabel,
    model.trilhaTravada,
    pendingBranchLabel,
    pendingBranchNodeId,
    pendingNode,
  ]);

  return {
    gridHtml,
    treeHostRef,
    confirmBarMode,
    confirmSuccess: confirmSuccess || Boolean(model.trilhaTravada),
    pendingNode,
    pendingBranchLabel,
    confirmedBranchLabel,
    confirmBranchGateway,
    cancelBranchSelection,
    progressTick,
    handleMouseOver,
    handleMouseLeave,
    legendLevels: MARCO_ABILITY_LEVEL_MIN_PLAYER_LEVEL.join(' / '),
  };
}
