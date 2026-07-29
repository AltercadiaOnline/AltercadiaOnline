import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MarcosStateSnapshot } from '../../../shared/playerDataSnapshots.js';
import { MARCO_BRANCH_LABELS } from '../../../shared/progression/milestoneTreeCatalog.js';
import { getActionDispatcher } from '../../ActionDispatcher.js';
import { getDataStore } from '../../economy/dataStoreAccess.js';
import { MARCO_ABILITY_LEVEL_MIN_PLAYER_LEVEL } from '../../../shared/progression/marcoProgression.js';
import { hasConfirmedMarcoTrail } from '../../../shared/progression/milestoneTreeState.js';
import {
  buildMarcosRenderModel,
  buildMarcosPlayerContext,
  handleMarcosPanelClick,
  showMarcoNodeTooltip,
} from './marcosPanelHandlers.js';
import { renderMarcoGrid } from '../../ui/marcos/renderMilestoneTree.js';
import { uiEvents, UIEventType } from '../../ui/uiEvents.js';
import { alertSystem } from '../../ui/alertSystem.js';

function buildMarcosStructuralKey(state: MarcosStateSnapshot): string {
  return `${state.ramificacaoSelecionada ?? ''}|${state.trilhaTravada}|${state.activeMarcos.join(',')}`;
}

export function useMarcosPanelState() {
  const [confirmSuccess, setConfirmSuccess] = useState(false);
  const [progressTick, setProgressTick] = useState(0);
  const [activating, setActivating] = useState(false);
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
      if (state.trilhaTravada && state.ramificacaoSelecionada) {
        setConfirmSuccess(true);
        setActivating(false);
      }
      const nextKey = buildMarcosStructuralKey(state);
      if (nextKey !== currentStructuralKey) {
        currentStructuralKey = nextKey;
      }
      setProgressTick((tick) => tick + 1);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const state = getDataStore().getMarcosState();
    if (state.trilhaTravada && state.ramificacaoSelecionada) {
      setConfirmSuccess(true);
    }
  }, []);

  const model = buildMarcosRenderModel(null, null);
  const gridHtml = renderMarcoGrid(model);

  const confirmedBranchLabel = model.ramificacaoSelecionada
    ? MARCO_BRANCH_LABELS[model.ramificacaoSelecionada]
    : null;

  // Delegação nativa — um clique no starter ativa a trilha (sem passo confirmar).
  useEffect(() => {
    const host = treeHostRef.current;
    if (!host) return undefined;

    const onTreeClick = (event: MouseEvent): void => {
      if (activating) return;
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;

      const result = handleMarcosPanelClick(target);
      if (result.pendingIntentId) {
        setActivating(true);
        void getActionDispatcher().waitForIntentResult(result.pendingIntentId).then((ok) => {
          setActivating(false);
          if (ok) {
            setConfirmSuccess(true);
            alertSystem('Trilha Marcos ativada.');
            setProgressTick((tick) => tick + 1);
            return;
          }
          setProgressTick((tick) => tick + 1);
        });
        return;
      }
      if (result.refreshFull) {
        setProgressTick((tick) => tick + 1);
      }
    };

    host.addEventListener('click', onTreeClick);
    return () => host.removeEventListener('click', onTreeClick);
  }, [activating]);

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

  const ctx = buildMarcosPlayerContext();
  const trailConfirmed = hasConfirmedMarcoTrail(ctx);

  const confirmBarMode = useMemo(() => {
    if (trailConfirmed && confirmedBranchLabel) return 'confirmed' as const;
    const playerLevel = ctx.playerLevel;
    if (playerLevel < MARCO_ABILITY_LEVEL_MIN_PLAYER_LEVEL[0]!) {
      return 'locked-level' as const;
    }
    if (!trailConfirmed) return 'choose' as const;
    return 'hidden' as const;
  }, [confirmedBranchLabel, ctx.playerLevel, trailConfirmed]);

  return {
    gridHtml,
    treeHostRef,
    confirmBarMode,
    confirmSuccess: confirmSuccess || trailConfirmed,
    confirmedBranchLabel,
    activating,
    progressTick,
    handleMouseOver,
    handleMouseLeave,
    legendLevels: MARCO_ABILITY_LEVEL_MIN_PLAYER_LEVEL.join(' / '),
    minTrailLevel: MARCO_ABILITY_LEVEL_MIN_PLAYER_LEVEL[0] ?? 10,
  };
}
