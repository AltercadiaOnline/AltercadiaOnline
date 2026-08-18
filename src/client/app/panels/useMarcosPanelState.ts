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
import { buildMarcoTrailStatusLine, hasConfirmedMarcoTrail } from '../../../shared/progression/milestoneTreeState.js';
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
import { getGlobalStateSynchronizer } from '../../sync/GlobalStateSynchronizer.js';

function buildMarcosStructuralKey(state: MarcosStateSnapshot): string {
  return `${state.ramificacaoSelecionada ?? ''}|${state.trilhaTravada}|${state.activeMarcos.join(',')}`;
}

export function useMarcosPanelState() {
  const [pendingBranch, setPendingBranch] = useState<MarcoRamificacaoId | null>(null);
  const [progressTick, setProgressTick] = useState(0);
  const [activating, setActivating] = useState(false);

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
        if (state.trilhaTravada) {
          setPendingBranch(null);
        }
      }
      setProgressTick((tick) => tick + 1);
      setActivating(false);
    });
    return () => unsub();
  }, []);

  const ctx = buildMarcosPlayerContext();
  const trailConfirmed = hasConfirmedMarcoTrail(ctx);
  const model = buildMarcosRenderModel(null, null, pendingBranch);
  const gridHtml = renderMarcoGrid(model);

  const confirmedBranch = model.ramificacaoSelecionada;
  const confirmedBranchLabel = confirmedBranch
    ? MARCO_BRANCH_LABELS[confirmedBranch]
    : null;
  const confirmedShortLabel = confirmedBranch
    ? MARCO_BRANCH_SHORT_LABELS[confirmedBranch]
    : null;

  /** Rodapé pós-ativação — só descrição (sem botão). */
  const trailStatusLine = useMemo(() => {
    if (!confirmedShortLabel) return null;
    return buildMarcoTrailStatusLine(ctx, confirmedShortLabel);
  }, [confirmedShortLabel, ctx.activeMarcos.length, ctx.playerLevel, ctx.ramificacaoSelecionada, ctx.trilhaTravada]);

  const trailOptions = useMemo(
    () => listMarcosTrailOptions(ctx.playerLevel),
    [ctx.playerLevel, progressTick, trailConfirmed],
  );

  // Após trilha ativa: clique em nó ○ obtém direto (sem botão no rodapé).
  const handleTreeClick = useCallback((event: React.MouseEvent<HTMLElement>): void => {
    if (!trailConfirmed) return;
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const pick = resolveMarcosAbilityPick(target);
    if (pick.kind === 'none') return;
    if (pick.kind === 'blocked') {
      alertSystem(pick.message);
      return;
    }
    if (activating) {
      alertSystem('Aguarde a confirmação do degrau anterior.');
      return;
    }

    void (async () => {
      setActivating(true);
      const result = obtainMarcosAbility(pick.nodeId);
      if (result.pendingIntentId) {
        const ok = await getActionDispatcher().waitForIntentResult(result.pendingIntentId);
        setActivating(false);
        if (ok) {
          alertSystem(`${pick.label} obtida.`);
          setProgressTick((tick) => tick + 1);
          getGlobalStateSynchronizer().requestFullState();
        } else {
          alertSystem('Não foi possível obter este degrau. Confira o ○ anterior e o nível do personagem.');
          getGlobalStateSynchronizer().requestFullState();
        }
        return;
      }
      setActivating(false);
      if (result.refreshFull) {
        setProgressTick((tick) => tick + 1);
      }
    })();
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
        alertSystem(`${MARCO_BRANCH_LABELS[pendingBranch]} ativada · 1º nível selecionado.`);
        setPendingBranch(null);
        setProgressTick((tick) => tick + 1);
      } else {
        alertSystem('Não foi possível ativar a trilha Marcos. Tente de novo.');
      }
      return;
    }
    setActivating(false);
    if (result.refreshFull) {
      setPendingBranch(null);
      setProgressTick((tick) => tick + 1);
    }
  }, [activating, pendingBranch, trailConfirmed]);

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
    trailStatusLine,
    activating,
    progressTick,
    pendingShort,
    pendingFocus,
    runActivateTrail,
    handleTreeClick,
    handleMouseOver,
    handleMouseLeave,
    legendLevels: MARCO_ABILITY_LEVEL_MIN_PLAYER_LEVEL.join(' / '),
    minTrailLevel,
    playerLevel: ctx.playerLevel,
  };
}
