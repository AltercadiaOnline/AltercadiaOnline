import {
  BattleUiEventType,
  battleUiEvents,
  type BattleVictoryUiReadyPayload,
} from '../../combat/battleUiEvents.js';
import { traceBattleFinish } from '../../hud/battleFinishProbe.js';
import { getPostBattleHudBridge, isReactPostBattleHudEnabled } from '../../app/bridge/postBattleHudBridge.js';
import {
  clearPostBattleHubHandlers,
  registerPostBattleHubHandlers,
} from '../../app/battle/postBattleHubHandlers.js';
import { resolvePostBattleHubMountTarget } from './PostBattleHub.js';
import { isPostBattleHubInteractive } from './battleSceneMount.js';
import { mountPostBattleHub, unmountPostBattleHub } from './PostBattleHub.js';
import { showBattleStatisticsPanel, closeBattleStatisticsPanel } from './BattleStatisticsPanel.js';
import {
  getPersistedBattleReport,
} from '../../combat/battleReportSession.js';
import { getBattleReportObservation } from '../../combat/battleObservationState.js';
import {
  openBattleLootCasinoOnDemand,
  teardownBattleLootCasinoState,
} from './battleLootCasinoFlow.js';
import { destroyActiveLootCasino, isLootCasinoSpinning } from './LootCasinoScreen.js';
import { postSystemNotification } from '../logService.js';
import { BattleType } from '../../../shared/combat/battleType.js';
import { openPostBattleHonorCard } from './postBattleHonorOpener.js';
import type { CombatDispatchPayload } from '../../../shared/combatWire.js';
import type { BattleLootSourceContext } from '../../game/battleLootStageClient.js';
import { resolveBattleLootStageStatus, hasValidPendingBattleLoot } from '../../game/battleLootStageClient.js';

export type PostBattleHubBridgeDeps = {
  readonly isBlocked: () => boolean;
  readonly onPresenting: (battleId: string) => void;
  readonly onExit: (payload: BattleVictoryUiReadyPayload) => Promise<void>;
  readonly clearSafety: () => void;
  readonly releaseInput: () => void;
  readonly removeHubUi: () => void;
  readonly getCombatDispatch: (battleId: string) => CombatDispatchPayload | null;
  readonly getBattleLootContext: (battleId: string) => BattleLootSourceContext;
};

let bridgeDeps: PostBattleHubBridgeDeps | null = null;
let unsubscribeVictoryReady: (() => void) | null = null;
let lastPresentedBattleId: string | null = null;

function mapLootStageToHubStatus(
  battleId: string,
  victory: boolean,
  isPvp: boolean,
): import('./PostBattleHub.js').PostBattleRewardsLootStatus {
  if (!victory || isPvp) return 'unavailable';
  const stage = resolveBattleLootStageStatus(battleId);
  if (stage === 'READY') return 'ready';
  if (stage === 'WAITING_FOR_SERVER') return 'waiting_for_server';
  return 'unavailable';
}

function mountHubForPayload(payload: BattleVictoryUiReadyPayload, skipRemove = false): void {
  if (!bridgeDeps || bridgeDeps.isBlocked()) {
    traceBattleFinish('mount.skip.blocked', { battleId: payload.battleId });
    return;
  }

  if (isPostBattleHubInteractive() && lastPresentedBattleId === payload.battleId) {
    traceBattleFinish('mount.skip.already', { battleId: payload.battleId });
    bridgeDeps.releaseInput();
    return;
  }

  if (!skipRemove) {
    bridgeDeps.removeHubUi();
  }

  bridgeDeps.clearSafety();
  bridgeDeps.onPresenting(payload.battleId);

  const overlayMount = resolvePostBattleHubMountTarget();
  lastPresentedBattleId = payload.battleId;

  traceBattleFinish('mount.dom.start', {
    battleId: payload.battleId,
    mountTag: overlayMount.tagName,
    mountId: overlayMount.id,
  });

  console.log('DEBUG: Tentando montar PostBattleHub...', { battleId: payload.battleId });

  try {
    const isPvp = payload.battleType === BattleType.PVP;
    const rewardsLootStatus = mapLootStageToHubStatus(payload.battleId, payload.victory, isPvp);

    const handlerBundle = {
      rewardsLootStatus,
      battleId: payload.battleId,
      onStatistics: () => {
        const report =
          getPersistedBattleReport(payload.battleId)
          ?? getBattleReportObservation();
        if (!report) {
          postSystemNotification('Relatório indisponível para esta batalha.', 'normal');
          return;
        }
        showBattleStatisticsPanel(report, overlayMount);
      },
      onRewards: () => {
        if (!hasValidPendingBattleLoot(payload.battleId)) {
          postSystemNotification('Recompensas ainda não disponíveis.', 'normal');
          return;
        }
        const lootContext = bridgeDeps?.getBattleLootContext(payload.battleId) ?? {};
        return openBattleLootCasinoOnDemand({
          battleId: payload.battleId,
          lootContext,
        });
      },
      onViewOpponent: () => {
        openPostBattleHonorCard(overlayMount);
      },
      onExit: async () => {
        if (isLootCasinoSpinning()) {
          postSystemNotification('Esperando animação…', 'normal');
          getPostBattleHudBridge().setExitPending(false);
          return;
        }
        closeBattleStatisticsPanel();
        teardownBattleLootCasinoState(payload.battleId);
        await bridgeDeps!.onExit(payload);
        lastPresentedBattleId = null;
        if (isReactPostBattleHudEnabled()) {
          getPostBattleHudBridge().dismiss();
          clearPostBattleHubHandlers();
        }
      },
    };

    if (isReactPostBattleHudEnabled()) {
      registerPostBattleHubHandlers(handlerBundle);
      getPostBattleHudBridge().present(payload, rewardsLootStatus);
    } else {
      mountPostBattleHub(
        {
          battleType: payload.battleType,
          victory: payload.victory,
          xpGain: payload.xpGain,
          ...(payload.endReason !== undefined ? { endReason: payload.endReason } : {}),
          ...(payload.rankingResult !== undefined ? { rankingResult: payload.rankingResult } : {}),
        },
        handlerBundle,
        overlayMount,
      );
    }
  } catch (error) {
    console.error('DEBUG: Erro na montagem:', error);
    throw error;
  }

  if (!isPostBattleHubInteractive()) {
    traceBattleFinish('mount.dom.fail.noExitButton', { battleId: payload.battleId });
    throw new Error('PostBattleHub montado sem botões interativos');
  }

  traceBattleFinish('mount.dom.ok', { battleId: payload.battleId });
  bridgeDeps.releaseInput();

  if (payload.victory) {
    postSystemNotification(
      payload.battleType === BattleType.PVP ? 'Duelo vencido.' : 'Monstro derrotado.',
      'high',
    );
  }
}

function handleBattleVictoryUiReady(payload: BattleVictoryUiReadyPayload): void {
  console.log('DEBUG: Evento recebido em PostBattleHubBridge', { battleId: payload.battleId });
  traceBattleFinish('event.BATTLE_VICTORY_UI_READY', { battleId: payload.battleId });
  if (!bridgeDeps || bridgeDeps.isBlocked()) return;

  try {
    mountHubForPayload(payload, true);
  } catch (error) {
    console.error('DEBUG: Erro na montagem:', error);
    console.error('[PostBattleHub] Falha ao montar hub (evento):', error);
    traceBattleFinish('event.mount.error', { error: String(error) });
    lastPresentedBattleId = null;
  }
}

export function initPostBattleHubBridge(deps: PostBattleHubBridgeDeps): void {
  teardownPostBattleHubBridge();
  bridgeDeps = deps;
  unsubscribeVictoryReady = battleUiEvents.on(
    BattleUiEventType.BATTLE_VICTORY_UI_READY,
    handleBattleVictoryUiReady,
  );
  traceBattleFinish('bridge.init');
}

/** Caminho direto — preferido sobre o evento. */
export function presentPostBattleHub(payload: BattleVictoryUiReadyPayload): boolean {
  console.log('DEBUG: Evento recebido em PostBattleHubBridge.presentPostBattleHub', {
    battleId: payload.battleId,
  });
  traceBattleFinish('present.direct', { battleId: payload.battleId });
  if (!bridgeDeps || bridgeDeps.isBlocked()) {
    traceBattleFinish('present.direct.noBridge');
    return false;
  }
  try {
    mountHubForPayload(payload, false);
    return isPostBattleHubInteractive();
  } catch (error) {
    console.error('DEBUG: Erro na montagem:', error);
    console.error('[PostBattleHub] presentPostBattleHub falhou:', error);
    traceBattleFinish('present.direct.error', { error: String(error) });
    lastPresentedBattleId = null;
    return false;
  }
}

/** @deprecated Use presentPostBattleHub */
export function forceMountPostBattleHub(payload: BattleVictoryUiReadyPayload): boolean {
  return presentPostBattleHub(payload);
}

export function teardownPostBattleHubBridge(): void {
  unsubscribeVictoryReady?.();
  unsubscribeVictoryReady = null;
  bridgeDeps = null;
  lastPresentedBattleId = null;
  if (isReactPostBattleHudEnabled()) {
    getPostBattleHudBridge().dismiss();
    clearPostBattleHubHandlers();
  }
  unmountPostBattleHub();
  destroyActiveLootCasino();
}

export function resetPostBattleHubBridgeSession(): void {
  lastPresentedBattleId = null;
  if (isReactPostBattleHudEnabled()) {
    getPostBattleHudBridge().dismiss();
    clearPostBattleHubHandlers();
  }
  unmountPostBattleHub();
  destroyActiveLootCasino();
}

export function isPostBattleHubBridgeReady(): boolean {
  return bridgeDeps !== null;
}
