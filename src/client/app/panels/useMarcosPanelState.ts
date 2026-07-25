import { useCallback, useEffect, useMemo, useState } from 'react';
import type { MarcosStateSnapshot } from '../../../shared/playerDataSnapshots.js';
import { MARCO_BRANCH_LABELS } from '../../../shared/progression/milestoneTreeCatalog.js';
import { getActionDispatcher } from '../../ActionDispatcher.js';
import { getDataStore } from '../../economy/economyLayer.js';
import { MARCO_ABILITY_LEVEL_MIN_PLAYER_LEVEL } from '../../../shared/progression/marcoProgression.js';
import {
  buildMarcosRenderModel,
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
  const [hoverNodeId, setHoverNodeId] = useState<string | null>(null);
  const [pendingBranchNodeId, setPendingBranchNodeId] = useState<string | null>(null);
  const [confirmSuccess, setConfirmSuccess] = useState(false);
  const [progressTick, setProgressTick] = useState(0);

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

  const model = buildMarcosRenderModel(hoverNodeId, pendingBranchNodeId);
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

  const handleClick = useCallback((event: React.MouseEvent<HTMLElement>) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (confirmBranchGateway.pending) return;

    const result = handleMarcosPanelClick(target, pendingBranchNodeId);
    if (!model.trilhaTravada) {
      setPendingBranchNodeId(result.pendingBranchNodeId);
      if (result.pendingBranchNodeId) {
        setConfirmSuccess(false);
      }
    }
    if (result.refreshFull) {
      setProgressTick((tick) => tick + 1);
    }
  }, [confirmBranchGateway.pending, model.trilhaTravada, pendingBranchNodeId]);

  const cancelBranchSelection = useCallback(() => {
    if (confirmBranchGateway.pending) return;
    setPendingBranchNodeId(null);
    setProgressTick((tick) => tick + 1);
  }, [confirmBranchGateway.pending]);

  const handleMouseOver = useCallback((event: React.MouseEvent<HTMLElement>) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const nodeBtn = target.closest<HTMLElement>('[data-marco-node]');
    const nextHover = nodeBtn?.dataset.marcoNode ?? null;
    if (nextHover === hoverNodeId) return;

    setHoverNodeId(nextHover);
    if (nextHover) {
      showMarcoNodeTooltip(target, event.clientX, event.clientY);
    }
  }, [hoverNodeId]);

  const handleMouseLeave = useCallback((event: React.MouseEvent<HTMLElement>) => {
    const grid = event.currentTarget.querySelector('[data-marcos-grid]');
    if (grid && !grid.contains(event.relatedTarget as Node)) {
      setHoverNodeId(null);
      uiEvents.emit(UIEventType.HIDE_TOOLTIP, {});
    }
  }, []);

  useEffect(() => () => {
    uiEvents.emit(UIEventType.HIDE_TOOLTIP, {});
  }, []);

  const confirmBarMode = useMemo(() => {
    if (model.trilhaTravada && confirmedBranchLabel) return 'confirmed' as const;
    if (pendingNode && pendingBranchLabel && !model.trilhaTravada) return 'pending' as const;
    if (!model.trilhaTravada) return 'idle' as const;
    return 'hidden' as const;
  }, [confirmedBranchLabel, model.trilhaTravada, pendingBranchLabel, pendingNode]);

  return {
    gridHtml,
    confirmBarMode,
    confirmSuccess: confirmSuccess || Boolean(model.trilhaTravada),
    pendingNode,
    pendingBranchLabel,
    confirmedBranchLabel,
    confirmBranchGateway,
    cancelBranchSelection,
    progressTick,
    handleClick,
    handleMouseOver,
    handleMouseLeave,
    legendLevels: MARCO_ABILITY_LEVEL_MIN_PLAYER_LEVEL.join(' / '),
  };
}
