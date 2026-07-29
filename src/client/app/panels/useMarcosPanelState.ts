import { useCallback, useEffect, useMemo, useState } from 'react';
import type { MarcosStateSnapshot } from '../../../shared/playerDataSnapshots.js';
import {
  MARCO_BRANCH_FOCUS,
  MARCO_BRANCH_LABELS,
  MARCO_BRANCH_SHORT_LABELS,
  type MarcoRamificacaoId,
} from '../../../shared/progression/milestoneTreeCatalog.js';
import { getActionDispatcher } from '../../ActionDispatcher.js';
import { getDataStore } from '../../economy/dataStoreAccess.js';
import { MARCO_ABILITY_LEVEL_MIN_PLAYER_LEVEL } from '../../../shared/progression/marcoProgression.js';
import { hasConfirmedMarcoTrail } from '../../../shared/progression/milestoneTreeState.js';
import {
  activateMarcosTrail,
  buildMarcosRenderModel,
  buildMarcosPlayerContext,
  listMarcosTrailOptions,
  obtainMarcosAbility,
  resolveMarcosAbilityPick,
  showMarcoNodeTooltip,
} from './marcosPanelHandlers.js';
import { renderMarcoGrid } from '../../ui/marcos/renderMilestoneTree.js';
import { uiEvents, UIEventType } from '../../ui/uiEvents.js';
import { alertSystem } from '../../ui/alertSystem.js';

function buildMarcosStructuralKey(state: MarcosStateSnapshot): string {
  return `${state.ramificacaoSelecionada ?? ''}|${state.trilhaTravada}|${state.activeMarcos.join(',')}`;
}

export function useMarcosPanelState() {
  const [pendingBranch, setPendingBranch] = useState<MarcoRamificacaoId | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const [progressTick, setProgressTick] = useState(0);
  const [activating, setActivating] = useState(false);

  const clearAbilitySelection = useCallback((): void => {
    setSelectedNodeId(null);
    setSelectedLabel(null);
  }, []);

  useEffect(() => {
    const unsubLevel = getDataStore().subscribe('characterLevel', () => {
      setProgressTick((tick) => tick + 1);
    });
    return () => unsubLevel();
  }, []);

  useEffect(() => {
    let currentStructuralKey = buildMarcosStructuralKey(getDataStore().getMarcosState());

    const unsub = getDataStore().subscribe('marcosState', (state) => {
      const nextKey = buildMarcosStructuralKey(state);
      if (nextKey !== currentStructuralKey) {
        currentStructuralKey = nextKey;
        clearAbilitySelection();
        if (state.trilhaTravada) {
          setPendingBranch(null);
        }
      }
      setProgressTick((tick) => tick + 1);
      setActivating(false);
    });
    return () => unsub();
  }, [clearAbilitySelection]);

  const ctx = buildMarcosPlayerContext();
  const trailConfirmed = hasConfirmedMarcoTrail(ctx);
  const model = buildMarcosRenderModel(null, selectedNodeId, pendingBranch);
  const gridHtml = renderMarcoGrid(model);

  const confirmedBranchLabel = model.ramificacaoSelecionada
    ? MARCO_BRANCH_LABELS[model.ramificacaoSelecionada]
    : null;

  const trailOptions = useMemo(
    () => listMarcosTrailOptions(ctx.playerLevel),
    // progressTick cobre mudanças de nível / estado Marcos
    [ctx.playerLevel, progressTick, trailConfirmed],
  );

  const handleTreeClick = useCallback((event: React.MouseEvent<HTMLElement>): void => {
    if (activating || !trailConfirmed) return;
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const pick = resolveMarcosAbilityPick(target);
    if (pick.kind === 'none') return;
    if (pick.kind === 'blocked') {
      alertSystem(pick.message);
      return;
    }
    setSelectedNodeId(pick.nodeId);
    setSelectedLabel(pick.label);
  }, [activating, trailConfirmed]);

  const handleMouseOver = useCallback((event: React.MouseEvent<HTMLElement>) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const nodeBtn = target.closest<HTMLElement>('[data-marco-node]');
    if (!nodeBtn?.dataset.marcoNode) return;
    showMarcoNodeTooltip(target, event.clientX, event.clientY);
  }, []);

  const handleMouseLeave = useCallback((event: React.MouseEvent<HTMLElement>) => {
    const grid = event.currentTarget.querySelector('[data-marcos-grid]');
    const related = event.relatedTarget;
    if (grid && related instanceof Node && grid.contains(related)) {
      return;
    }
    uiEvents.emit(UIEventType.HIDE_TOOLTIP, {});
  }, []);

  useEffect(() => () => {
    uiEvents.emit(UIEventType.HIDE_TOOLTIP, {});
  }, []);

  const runActivateTrail = useCallback(async (): Promise<void> => {
    if (!pendingBranch || activating || trailConfirmed) return;
    setActivating(true);
    const result = activateMarcosTrail(pendingBranch);
    if (result.pendingIntentId) {
      const ok = await getActionDispatcher().waitForIntentResult(result.pendingIntentId);
      setActivating(false);
      if (ok) {
        alertSystem(`${MARCO_BRANCH_LABELS[pendingBranch]} ativada. Agora obtenha o 1º nível.`);
        setPendingBranch(null);
        clearAbilitySelection();
        setProgressTick((tick) => tick + 1);
      }
      return;
    }
    setActivating(false);
    if (result.refreshFull) {
      setPendingBranch(null);
      clearAbilitySelection();
      setProgressTick((tick) => tick + 1);
    }
  }, [activating, clearAbilitySelection, pendingBranch, trailConfirmed]);

  const runObtainAbility = useCallback(async (): Promise<void> => {
    if (!selectedNodeId || activating || !trailConfirmed) return;
    setActivating(true);
    const result = obtainMarcosAbility(selectedNodeId);
    if (result.pendingIntentId) {
      const ok = await getActionDispatcher().waitForIntentResult(result.pendingIntentId);
      setActivating(false);
      if (ok) {
        alertSystem('Habilidade Marcos obtida.');
        clearAbilitySelection();
        setProgressTick((tick) => tick + 1);
      }
      return;
    }
    setActivating(false);
    if (result.refreshFull) {
      clearAbilitySelection();
      setProgressTick((tick) => tick + 1);
    }
  }, [activating, clearAbilitySelection, selectedNodeId, trailConfirmed]);

  const minTrailLevel = MARCO_ABILITY_LEVEL_MIN_PLAYER_LEVEL[0] ?? 10;
  const canChooseTrail = !trailConfirmed && ctx.playerLevel >= minTrailLevel;

  const pendingShort = pendingBranch ? MARCO_BRANCH_SHORT_LABELS[pendingBranch] : null;
  const pendingFocus = pendingBranch ? MARCO_BRANCH_FOCUS[pendingBranch] : null;

  return {
    gridHtml,
    trailOptions,
    pendingBranch,
    setPendingBranch,
    canChooseTrail,
    trailConfirmed,
    confirmedBranchLabel,
    selectedNodeId,
    selectedLabel,
    activating,
    progressTick,
    pendingShort,
    pendingFocus,
    runActivateTrail,
    runObtainAbility,
    handleTreeClick,
    handleMouseOver,
    handleMouseLeave,
    legendLevels: MARCO_ABILITY_LEVEL_MIN_PLAYER_LEVEL.join(' / '),
    minTrailLevel,
    playerLevel: ctx.playerLevel,
  };
}
