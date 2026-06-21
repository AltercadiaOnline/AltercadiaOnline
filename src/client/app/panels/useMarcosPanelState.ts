import { useCallback, useEffect, useState } from 'react';
import type { MarcosStateSnapshot } from '../../../shared/playerDataSnapshots.js';
import { getDataStore } from '../../economy/economyLayer.js';
import { MARCO_ABILITY_LEVEL_MIN_PLAYER_LEVEL } from '../../../shared/progression/marcoProgression.js';
import {
  buildMarcosRenderModel,
  handleMarcosPanelClick,
  showMarcoNodeTooltip,
} from './marcosPanelHandlers.js';
import {
  findMarcoNodeView,
  renderMarcoBranchConfirmOverlay,
  renderMarcoGrid,
} from '../../ui/marcos/renderMilestoneTree.js';
import { uiEvents, UIEventType } from '../../ui/uiEvents.js';

function buildMarcosStructuralKey(state: MarcosStateSnapshot): string {
  return `${state.ramificacaoSelecionada ?? ''}|${state.trilhaTravada}|${state.activeMarcos.join(',')}`;
}

export function useMarcosPanelState() {
  const [hoverNodeId, setHoverNodeId] = useState<string | null>(null);
  const [pendingBranchNodeId, setPendingBranchNodeId] = useState<string | null>(null);
  const [progressTick, setProgressTick] = useState(0);

  useEffect(() => {
    let currentStructuralKey = buildMarcosStructuralKey(getDataStore().getMarcosState());

    const unsub = getDataStore().subscribe('marcosState', (state) => {
      if (pendingBranchNodeId && state.trilhaTravada) {
        setPendingBranchNodeId(null);
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

  const model = buildMarcosRenderModel(hoverNodeId);
  const pendingNode = findMarcoNodeView(model.nodes, pendingBranchNodeId);
  const gridHtml = renderMarcoGrid(model);
  const confirmHtml = pendingNode ? renderMarcoBranchConfirmOverlay(pendingNode) : '';

  const handleClick = useCallback((event: React.MouseEvent<HTMLElement>) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const result = handleMarcosPanelClick(target, pendingBranchNodeId);
    setPendingBranchNodeId(result.pendingBranchNodeId);
    if (result.refreshFull) {
      setProgressTick((tick) => tick + 1);
    }
  }, [pendingBranchNodeId]);

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

  return {
    gridHtml,
    confirmHtml,
    progressTick,
    handleClick,
    handleMouseOver,
    handleMouseLeave,
    legendLevels: MARCO_ABILITY_LEVEL_MIN_PLAYER_LEVEL.join(' / '),
  };
}
