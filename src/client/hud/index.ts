import type { ActionRequest, CombatEvent } from '../../shared/events.js';
import { CombatEventType } from '../../shared/events.js';
import { syncPetStoreFromCombatEvents } from '../pet/petCombatSync.js';
import type { CombatDispatchPayload, CombatUiHints } from '../../shared/combatWire.js';
export type { BattleEndedPayload } from '../../shared/combat/battleEnded.js';
export { isBattleEndedPayload } from '../../shared/combat/battleEnded.js';
export type { CombatDispatchPayload, CombatUiHints } from '../../shared/combatWire.js';
export { isCombatDispatchPayload, buildCombatUiHints } from '../../shared/combatWire.js';
import type { BattleEndedPayload } from '../../shared/combat/battleEnded.js';
import { BATTLE_SURRENDER_VOLT_PENALTY } from '../../shared/combat/battleSurrenderConstants.js';
import {
  dismissBattleSurrenderConfirm,
  showBattleSurrenderConfirm,
} from '../ui/battle/battleSurrenderConfirm.js';
import {
  clearPendingBattleLoot,
  peekPendingBattleLoot,
} from './battleLootBuffer.js';
import { clearBattleLootPackages } from './battleLootPackageBuffer.js';
import {
  clearBattleLootStageSession,
  ensureBattleLootPackageStaged,
  isOnlineCombatClient,
} from '../game/battleLootStageClient.js';
import { postSystemNotification } from '../ui/logService.js';
import { alertSystem } from '../ui/alertSystem.js';
import type { CombatFinishedPayload } from '../../shared/combat/combatFinished.js';
import {
  initPostBattleHubBridge,
  resetPostBattleHubBridgeSession,
  presentPostBattleHub,
  isPostBattleHubBridgeReady,
} from '../ui/battle/postBattleHubBridge.js';
import { mountEmergencyBattleExit, unmountEmergencyBattleExit } from '../ui/battle/battleEmergencyExit.js';
import {
  installBattleFinishDebugGlobal,
  showBattleFinishDebugPanel,
  traceBattleFinish,
} from './battleFinishProbe.js';
import { refreshCombatDevBindings } from '../dev/combatDevBindings.js';
import { destroyActiveLootCasino } from '../ui/battle/LootCasinoScreen.js';
import {
  emitBattleVictoryUiReady,
  type BattleVictoryUiReadyPayload,
} from '../combat/battleUiEvents.js';
import { mirrorBattleProgressionGrant } from '../progression/battleProgressionClient.js';
import { getGameStore } from '../state/GameStore.js';
import { createCorrelationId } from '../../shared/sync/pendingActionProtocol.js';
import {
  BATTLE_RESULT_HUB_SELECTOR,
  ensureBattleHubMountTarget,
  ensurePostBattleOverlayMount,
  isBattleResultHubVisible,
  isPostBattleHubInteractive,
} from '../ui/battle/battleSceneMount.js';
import { showBattleResultOverlay } from './battleResultOverlay.js';
import { unmountPostBattleHub } from '../ui/battle/PostBattleHub.js';
import { resetPlayerHonorCardSession } from '../ui/battle/PlayerHonorCard.js';
import {
  capturePostBattleHonorContext,
  clearPostBattleHonorContext,
} from '../ui/battle/postBattleHonorContext.js';
import {
  configurePostBattleHonorOpener,
} from '../ui/battle/postBattleHonorOpener.js';
import { syncBattleChatOpponentAuthor } from '../ui/battle/BattleScreen.js';
import { enterPostBattleObservation, clearBattleObservationState } from '../combat/battleObservationState.js';
import {
  ingestBattleHonorStats,
  resetBattleHonorStatsStore,
} from '../ui/battle/battleHonorStatsStore.js';
import {
  clearBattleReportSession,
  ingestBattleStatsReport,
} from '../combat/battleReportSession.js';
import { BattleType } from '../../shared/combat/battleType.js';
import { buildEmptyLootRevealSlots } from '../../shared/loot/lootRevealSlots.js';
import {
  setBattlePlaybackClosing,
  setCombatActionPlaybackActive,
} from '../combat/combatPlaybackState.js';
import {
  logCriticalBattleError,
  raceCombatPlayback,
} from '../combat/combatSafeExecution.js';
import { clearBattleFinishSafety } from './battleFinishSafety.js';
import {
  buildFinishPayloadFromBattleEnded,
  buildMinimalFinishPresentation,
  canOpenBattleResultHub,
  mergeFinishPresentationPayload,
  POST_BATTLE_HUB_GUARD_MS,
  resolveBattleFinishPresentation,
  resolveBattleTypeForPresentation,
  resolveRankingResultForPresentation,
  shouldFinalizeBattleAfterPlayback,
  type BattleFinishPresentationPayload,
} from './battleFinishFlow.js';
import { getCombatRole, resolveCombatantHp } from '../../shared/pet/petCombatRules.js';
import { requestReturnToExploration } from '../game/battleReturnToWorld.js';
import { removeActiveWorldMonster } from '../../shared/world/worldMonsterInstances.js';
import { getGameStateManager } from '../../shared/state/GameStateManager.js';
import type { CombatState } from '../../shared/types.js';
import {
  attachCombatSocketListener,
  gameClientCombatBridge,
  type CombatSocket,
} from './combatSocketHandler.js';

export {
  attachCombatSocketListener,
  createCombatSocketHandler,
  gameClientCombatBridge,
  type CombatSocket,
  type CombatHudBridge,
} from './combatSocketHandler.js';
import { HUDManager } from './HUDManager.js';
import { BattleController } from '../combat/BattleController.js';
import {
  clearCombatFeedbackSession,
  initCombatFeedbackOrchestrator,
  resetCombatFeedbackOrchestrator,
} from '../combat/CombatFeedbackOrchestrator.js';
import {
  getCombatTurnGateway,
  initCombatTurnGateway,
  resetCombatTurnGateway,
} from '../combat/CombatTurnGateway.js';
import { subscribeConnectionPhase } from '../sync/connectionState.js';
import { getPendingIntentRegistry } from '../sync/pendingIntentRegistry.js';
import { resetVfxProjectileManager } from '../combat/VfxProjectileManager.js';
import { getBattleStore, initBattleStore, resetBattleStore } from './battleStore.js';
import { getGlobalPlayerStore } from '../ui/moveset/globalPlayerStore.js';
import { BattleCommandController } from './BattleCommandController.js';
import { BattleItemsController } from './BattleItemsController.js';
import { BattleScreen, queryBattleScreenElements } from './battleScreen.js';
import {
  initBattleScreenUI,
  mountBattleScreenView,
  unmountBattleScreenView,
  getBattleLogPanel,
} from '../ui/battle/BattleScreen.js';
import {
  getTurnStateGuard,
  initTurnStateGuard,
  resetTurnStateGuard,
} from '../combat/turnStateGuard.js';

export type BattleFinishedResult = {
  readonly monsterId: string;
  readonly victory: boolean;
  readonly endReason?: import('../../shared/combat/battleEnded.js').BattleEndReason;
};

export type BattleScreenMountOptions = {
  readonly monsterId: string | null;
  readonly onBattleFinished: (result: BattleFinishedResult) => void;
};

let battleMount: BattleScreenMountOptions | null = null;
let hud: HUDManager | null = null;
let battleScreen: BattleScreen | null = null;
let battleCommand: BattleCommandController | null = null;
let battleItems: BattleItemsController | null = null;
let teardownBattleScreenUi: (() => void) | null = null;
let lastDispatch: CombatDispatchPayload | null = null;
let emitCombatAction: ((action: ActionRequest) => void) | undefined;
let emitCombatForfeit: ((battleId: string) => void) | undefined;
let battleEndHandled = false;
let combatFinishedPresenting = false;
let pendingBattleEndedPayload: BattleEndedPayload | null = null;
let finishFlowBattleId: string | null = null;
let activeBattleId: string | null = null;
let forfeitInFlight = false;
let battleInputFrozen = false;
let combatActionPending = false;
let onBattleEnded: (() => void) | undefined;
/** Snapshot do último combat-event com phase ENDED — não perder se lastDispatch for sobrescrito. */
let lastEndedDispatch: CombatDispatchPayload | null = null;
/** Incrementa a cada `combat-event` — callbacks antigos da fila não abrem o hub de fim. */
let combatDispatchGeneration = 0;
let battleReturnStuckTimer: ReturnType<typeof setTimeout> | null = null;

function clearBattleReturnStuckTimer(): void {
  if (battleReturnStuckTimer !== null) {
    clearTimeout(battleReturnStuckTimer);
    battleReturnStuckTimer = null;
  }
}

function isPostBattleChoicePending(): boolean {
  return isPostBattleHubInteractive() || isBattleResultHubVisible();
}

function resetStuckPostBattlePresenting(): void {
  if (!combatFinishedPresenting || isBattleResultHubVisible()) return;
  combatFinishedPresenting = false;
}

function resolveDispatchForFinish(battleId: string): CombatDispatchPayload | null {
  if (!battleId) return lastEndedDispatch ?? lastDispatch;
  if (lastEndedDispatch?.state.battleId === battleId) return lastEndedDispatch;
  if (lastDispatch?.state.battleId === battleId) return lastDispatch;
  return null;
}

function resolveBattleLootContext(battleId: string): import('../game/battleLootStageClient.js').BattleLootSourceContext {
  const dispatch = resolveDispatchForFinish(battleId);
  const ended = pendingBattleEndedPayload?.battleId === battleId ? pendingBattleEndedPayload : null;
  const preview = peekPendingBattleLoot();
  return {
    ...(dispatch ? { dispatch } : {}),
    ...(dispatch?.ui.playerActorId ? { playerActorId: dispatch.ui.playerActorId } : {}),
    ...(ended?.monsterInstanceId ? { monsterInstanceId: ended.monsterInstanceId } : {}),
    ...(preview?.sourceId ? { previewSourceId: preview.sourceId } : {}),
  };
}

function stagePostBattleLootIfVictory(payload: BattleEndedPayload): void {
  if (!payload.victory) return;
  if (payload.battleType === BattleType.PVP) return;
  if (isOnlineCombatClient()) return;
  ensureBattleLootPackageStaged(payload.battleId, resolveBattleLootContext(payload.battleId));
}

function rememberEndedDispatch(data: CombatDispatchPayload): void {
  if (data.state.phase === 'ENDED') {
    lastEndedDispatch = data;
  }
}

function releasePostBattleInput(): void {
  combatActionPending = false;
  forfeitInFlight = false;
  dismissBattleSurrenderConfirm();
  battleCommand?.lock();
  battleItems?.lock();
  battleInputFrozen = true;
  document.querySelector('#scene-combat')?.classList.add('is-battle-input-frozen');
}

function resolveFinishPresentationForBattle(
  dispatch: CombatDispatchPayload | null,
  battleId: string,
  combatFinished: CombatFinishedPayload | null,
): BattleFinishPresentationPayload | null {
  const fromDispatch = resolveBattleFinishPresentation(
    dispatch,
    battleId,
    pendingBattleEndedPayload,
    null,
  );
  if (fromDispatch) return fromDispatch;
  if (combatFinished) {
    return mergeFinishPresentationPayload(combatFinished, pendingBattleEndedPayload);
  }
  if (pendingBattleEndedPayload?.battleId === battleId) {
    return buildFinishPayloadFromBattleEnded(pendingBattleEndedPayload, peekPendingBattleLoot());
  }
  if (
    dispatch
    && dispatch.state.battleId === battleId
    && dispatch.state.phase === 'ENDED'
  ) {
    return buildMinimalFinishPresentation(dispatch, battleId, pendingBattleEndedPayload);
  }
  return null;
}

function buildExitPayloadFromVictoryUi(payload: BattleVictoryUiReadyPayload): BattleEndedPayload {
  const ended = pendingBattleEndedPayload;
  if (ended && ended.battleId === payload.battleId) return ended;

  return {
    battleId: payload.battleId,
    victory: payload.victory,
    monsterInstanceId: payload.monsterInstanceId ?? '',
    lootGranted: false,
    xpGain: payload.xpGain,
    battleType: payload.battleType,
    ...(payload.rankingResult !== undefined ? { rankingResult: payload.rankingResult } : {}),
    ...(payload.endReason !== undefined ? { endReason: payload.endReason } : {}),
    ...(payload.surrenderVoltPenalty !== undefined
      ? { surrenderVoltPenalty: payload.surrenderVoltPenalty }
      : {}),
  };
}

function presentationToVictoryPayload(
  presentation: BattleFinishPresentationPayload,
): BattleVictoryUiReadyPayload {
  const exitPayload = buildExitPayload(presentation);
  const dispatch = resolveDispatchForFinish(presentation.battleId);
  const battleType = resolveBattleTypeForPresentation(
    presentation,
    dispatch,
    pendingBattleEndedPayload,
  );
  const rankingResult = resolveRankingResultForPresentation(
    presentation,
    pendingBattleEndedPayload,
  );

  const hasLoot = resolveHasLootForPresentation(presentation, battleType);

  return {
    battleId: presentation.battleId,
    victory: presentation.victory,
    xpGain: presentation.xpGain ?? 0,
    battleType,
    ...(rankingResult !== undefined ? { rankingResult } : {}),
    ...(presentation.endReason !== undefined ? { endReason: presentation.endReason } : {}),
    ...(presentation.surrenderVoltPenalty !== undefined
      ? { surrenderVoltPenalty: presentation.surrenderVoltPenalty }
      : {}),
    ...(exitPayload.monsterInstanceId
      ? { monsterInstanceId: exitPayload.monsterInstanceId }
      : {}),
    ...(hasLoot !== undefined ? { hasLoot } : {}),
  };
}

function resolveHasLootForPresentation(
  presentation: BattleFinishPresentationPayload,
  battleType: BattleType,
): boolean | undefined {
  if (battleType === BattleType.PVP || !presentation.victory) return false;
  if (pendingBattleEndedPayload?.battleId === presentation.battleId
    && pendingBattleEndedPayload.hasLoot !== undefined) {
    return pendingBattleEndedPayload.hasLoot;
  }
  return undefined;
}

/** Garante hub visível — caminho direto, sem depender só do event bus. */
function presentPostBattleHubGuaranteed(
  presentation: BattleFinishPresentationPayload,
): boolean {
  const payload = presentationToVictoryPayload(presentation);
  traceBattleFinish('guaranteed.start', { battleId: payload.battleId });

  if (isPostBattleHubInteractive()) {
    traceBattleFinish('guaranteed.already');
    releasePostBattleInput();
    return true;
  }

  if (isPostBattleHubBridgeReady() && presentPostBattleHub(payload)) {
    return true;
  }

  traceBattleFinish('guaranteed.failed');
  return false;
}

function presentPostBattleHubRecovery(
  presentation: BattleFinishPresentationPayload,
  exitPayload: BattleEndedPayload,
): void {
  traceBattleFinish('recovery.start', { battleId: presentation.battleId });

  mountEmergencyBattleExit(async () => {
    clearBattleLootPackages();
    clearPendingBattleLoot();
    destroyActiveLootCasino();
    await completeBattleExit(exitPayload);
    combatFinishedPresenting = false;
  });

  void showBattleResultOverlay({
    victory: presentation.victory,
    ...(presentation.endReason !== undefined ? { endReason: presentation.endReason } : {}),
    summaryLines: [
      presentation.victory ? 'Monstro derrotado.' : 'Batalha encerrada.',
      'Use SAIR PARA O MAPA abaixo.',
    ],
    mountRoot: document.body,
    onExit: async () => {
      unmountEmergencyBattleExit();
      clearBattleLootPackages();
      clearPendingBattleLoot();
      await completeBattleExit(exitPayload);
      combatFinishedPresenting = false;
    },
  }).then(() => {
    releasePostBattleInput();
  });

  showBattleFinishDebugPanel(
    'PostBattleHub não montou. Use __altercadiaBattleFinish.dump() no console e envie o trace.',
    { battleId: presentation.battleId },
  );
}

/** Evento primordial + montagem direta garantida. */
function emitPostBattleUiReady(presentation: BattleFinishPresentationPayload): void {
  if (battleEndHandled) return;
  clearBattleFinishSafety();
  combatFinishedPresenting = true;
  finishFlowBattleId = presentation.battleId;

  const payload = presentationToVictoryPayload(presentation);
  const exitPayload = buildExitPayload(presentation);

  const mounted = presentPostBattleHubGuaranteed(presentation);
  if (!isPostBattleHubInteractive()) {
    console.log('DEBUG: Evento BATTLE_ENDED disparado', { source: 'emitPostBattleUiReady.emitBattleVictoryUiReady' });
    emitBattleVictoryUiReady(payload);
  }

  if (!mounted && !isPostBattleHubInteractive()) {
    presentPostBattleHubGuaranteed(presentation);
  }

  if (!isPostBattleHubInteractive()) {
    presentPostBattleHubRecovery(presentation, exitPayload);
  }
}

function openPostBattleHubForBattle(battleId: string): void {
  console.log('DEBUG: Evento recebido em GameClient.openPostBattleHubForBattle', { battleId });
  if (battleEndHandled || isPostBattleHubInteractive()) return;

  const dispatch = resolveDispatchForFinish(battleId);
  const finished = dispatch?.events.find((e) => e.type === CombatEventType.COMBAT_FINISHED);
  const combatFinished =
    finished?.type === CombatEventType.COMBAT_FINISHED ? finished.payload : null;
  const presentation = resolveFinishPresentationForBattle(dispatch, battleId, combatFinished);

  if (!presentation) {
    if (dispatch?.state.phase === 'ENDED') {
      openBattleResultHub(buildMinimalFinishPresentation(dispatch, battleId, pendingBattleEndedPayload));
    }
    return;
  }

  openBattleResultHub(presentation);
}

/** Fallback tardio — só se o hub não montou após o playback (nunca no recebimento do ENDED). */
function scheduleBattleReturnStuckGuard(): void {
  clearBattleReturnStuckTimer();
  if (battleEndHandled || getGameStateManager().isExploration()) return;
  if (isPostBattleChoicePending()) return;

  battleReturnStuckTimer = setTimeout(() => {
    battleReturnStuckTimer = null;
    if (battleEndHandled || getGameStateManager().isExploration()) return;
    if (isPostBattleChoicePending()) return;

    resetStuckPostBattlePresenting();
    getBattleLogPanel()?.append('[AVISO] Abrindo menu pós-batalha…');

    const battleId =
      lastEndedDispatch?.state.battleId
      ?? lastDispatch?.state.battleId
      ?? activeBattleId;

    if (battleId) {
      openPostBattleHubForBattle(battleId);
    }
  }, POST_BATTLE_HUB_GUARD_MS);
}

async function presentPostBattleHubFallback(
  presentation: BattleFinishPresentationPayload,
  exitPayload: BattleEndedPayload,
): Promise<void> {
  const combatMount = ensurePostBattleOverlayMount();
  await showBattleResultOverlay({
    victory: presentation.victory,
    ...(presentation.endReason !== undefined ? { endReason: presentation.endReason } : {}),
    summaryLines: [
      presentation.victory ? 'Monstro derrotado.' : 'Batalha encerrada.',
      'Escolha voltar ao mapa quando estiver pronto.',
    ],
    mountRoot: combatMount,
    onExit: async () => {
      clearBattleLootPackages();
      clearPendingBattleLoot();
      await completeBattleExit(exitPayload);
    },
  });
  combatMount.querySelector('.battle-result-overlay')?.classList.add('battle-result-hub--scene');
  releasePostBattleInput();
  if (presentation.victory) {
    postSystemNotification('Monstro derrotado.', 'high');
  }
}

function removePostBattleHubUi(): void {
  destroyActiveLootCasino();
  resetPlayerHonorCardSession();
  clearPostBattleHonorContext();
  clearBattleObservationState();
  configurePostBattleHonorOpener(null);
  unmountPostBattleHub();
  unmountEmergencyBattleExit();
  if (typeof document === 'undefined') return;
  document.querySelectorAll(BATTLE_RESULT_HUB_SELECTOR).forEach((node) => node.remove());
  document.querySelector('#scene-combat')?.classList.remove('is-post-battle-hub-dismissed');
}

function resolveStuckBattleExitPayload(): BattleEndedPayload | null {
  if (pendingBattleEndedPayload) return pendingBattleEndedPayload;

  const dispatch = lastEndedDispatch ?? lastDispatch;
  if (!dispatch) return null;

  const finished = dispatch.events.find((e) => e.type === CombatEventType.COMBAT_FINISHED);
  const combatFinished =
    finished?.type === CombatEventType.COMBAT_FINISHED ? finished.payload : null;
  const presentation = resolveFinishPresentationForBattle(
    dispatch,
    dispatch.state.battleId,
    combatFinished,
  );
  if (presentation) return buildExitPayload(presentation);

  return {
    battleId: dispatch.state.battleId,
    victory: false,
    monsterInstanceId: '',
    lootGranted: false,
    endReason: forfeitInFlight ? 'FORFEIT' : 'DEFEAT',
    xpGain: 0,
  };
}

function resolveMonsterIdForExit(payload: BattleEndedPayload): string {
  const encounter = getGlobalPlayerStore().getActiveEncounter();
  return payload.monsterInstanceId
    || encounter?.monsterId
    || battleMount?.monsterId
    || '';
}

/** Volta ao mapa — só marca fim como concluído após EXPLORATION confirmado. */
async function exitBattleToWorld(payload: BattleEndedPayload): Promise<boolean> {
  if (battleEndHandled) return true;

  if (payload.victory && payload.monsterInstanceId) {
    removeActiveWorldMonster(payload.monsterInstanceId);
  }

  const monsterId = resolveMonsterIdForExit(payload);

  try {
    await requestReturnToExploration({
      victory: payload.victory,
      ...(payload.endReason !== undefined ? { endReason: payload.endReason } : {}),
      ...(monsterId ? { monsterId } : {}),
    });

    if (!getGameStateManager().isExploration()) {
      throw new Error('GameState não voltou para EXPLORATION');
    }

    battleEndHandled = true;
    pendingBattleEndedPayload = null;
    finishFlowBattleId = null;
    lastEndedDispatch = null;
    unfreezeBattleInput();
    clearBattleReturnStuckTimer();
    clearBattleReportSession();
    removePostBattleHubUi();
    return true;
  } catch (error) {
    console.error('[HUD] Falha ao voltar ao mapa top-down:', error);
    getBattleLogPanel()?.append('[ERRO] Não foi possível restaurar o mapa. Tente SAIR PARA O MAPA novamente.');
    unfreezeBattleInput();
    combatFinishedPresenting = false;
    openPostBattleHubForBattle(payload.battleId);
    return false;
  }
}

function isEnemyDamageEvent(
  event: CombatEvent,
  playerActorId: string,
): boolean {
  if (event.type !== CombatEventType.DAMAGE_DEALT) return false;
  if (event.payload.hpAfter > 0) return false;
  const targetId = event.payload.targetId;
  return targetId !== playerActorId && !targetId.startsWith('pet_');
}

function completeBattleExit(payload: BattleEndedPayload): Promise<void> {
  if (battleEndHandled) return Promise.resolve();
  clearBattleFinishSafety();
  document.querySelectorAll('.battle-result-overlay').forEach((node) => node.remove());

  return new Promise((resolve) => {
    const finalizeExit = () => {
      void exitBattleToWorld(payload).finally(resolve);
    };

    if (!battleScreen) {
      finalizeExit();
      return;
    }

    void battleScreen.exitWithFade(finalizeExit).catch(finalizeExit);
  });
}

function buildExitPayload(
  presentation: BattleFinishPresentationPayload,
): BattleEndedPayload {
  const ended = pendingBattleEndedPayload;
  if (ended && ended.battleId === presentation.battleId) {
    return ended;
  }

  return {
    battleId: presentation.battleId,
    victory: presentation.victory,
    monsterInstanceId: '',
    lootGranted: false,
    xpGain: presentation.xpGain,
    battleType: presentation.battleType ?? resolveBattleTypeForPresentation(
      presentation,
      resolveDispatchForFinish(presentation.battleId),
      pendingBattleEndedPayload,
    ),
    ...(presentation.rankingResult !== undefined ? { rankingResult: presentation.rankingResult } : {}),
    ...(presentation.endReason !== undefined ? { endReason: presentation.endReason } : {}),
    ...(presentation.surrenderVoltPenalty !== undefined
      ? { surrenderVoltPenalty: presentation.surrenderVoltPenalty }
      : {}),
  };
}

/** Monta hub — montagem direta; evento é reforço idempotente. */
function openBattleResultHub(presentation: BattleFinishPresentationPayload): void {
  if (battleEndHandled) return;

  const dispatch = resolveDispatchForFinish(presentation.battleId);
  const battleType = resolveBattleTypeForPresentation(
    presentation,
    dispatch,
    pendingBattleEndedPayload,
  );

  if (
    presentation.victory
    && battleType !== BattleType.PVP
    && !isOnlineCombatClient()
  ) {
    ensureBattleLootPackageStaged(
      presentation.battleId,
      resolveBattleLootContext(presentation.battleId),
    );
  }

  if (dispatch && battleType === BattleType.PVP) {
    capturePostBattleHonorContext(
      dispatch,
      battleType,
      presentation.rankingResult ?? pendingBattleEndedPayload?.rankingResult,
    );
    enterPostBattleObservation();
    if (dispatch.ui.playerActorId) {
      configurePostBattleHonorOpener({
        giverActorId: dispatch.ui.playerActorId,
        characterId: 1,
      });
    }
    syncBattleChatOpponentAuthor();
  }

  if (presentation.endReason === 'FORFEIT') {
    removePostBattleHubUi();
    presentBattleFleeResult(presentation);
    return;
  }

  if (!isPostBattleHubInteractive()) {
    removePostBattleHubUi();
  }

  try {
    emitPostBattleUiReady(presentation);
  } catch (error) {
    console.error('DEBUG: Erro na montagem:', error);
    console.error('[HUD] Falha ao abrir hub pós-batalha:', error);
    traceBattleFinish('openBattleResultHub.error', { error: String(error) });
    combatFinishedPresenting = false;
    unfreezeBattleInput();
    presentPostBattleHubRecovery(presentation, buildExitPayload(presentation));
  }
}

function beginBattleFinishFlow(base: CombatFinishedPayload): void {
  const presentation = mergeFinishPresentationPayload(base, pendingBattleEndedPayload);
  openBattleResultHub(presentation);
}

/** Espelha HP final no DOM antes do hub — evita vitória com barra ainda cheia. */
function commitFinalBattleVitals(dispatch: CombatDispatchPayload): void {
  GameClient.renderState(dispatch.state, dispatch.ui);
  const screen = getBattleScreen();
  if (!screen) return;

  for (const [id, combatant] of Object.entries(dispatch.state.combatants)) {
    if (getCombatRole(combatant) !== 'ENEMY') continue;
    screen.commitCombatantHp(id, resolveCombatantHp(combatant));
  }
}

/** Abre hub só após a fila de animações (HP zerado na tela). */
function finalizeBattleFinishAfterPlayback(
  dispatch: CombatDispatchPayload,
  combatFinished: CombatFinishedPayload | null,
): void {
  if (battleEndHandled) return;
  if (!shouldFinalizeBattleAfterPlayback(dispatch)) return;

  const battleId = combatFinished?.battleId ?? dispatch.state.battleId;
  if (!canOpenBattleResultHub(dispatch, battleId, pendingBattleEndedPayload, activeBattleId)) {
    return;
  }

  if (combatFinished?.victory && combatFinished.progressionGrant) {
    mirrorBattleProgressionGrant(battleId, combatFinished.progressionGrant);
  }

  commitFinalBattleVitals(dispatch);
  clearBattleFinishSafety();
  setBattlePlaybackClosing(true);
  openPostBattleHubForBattle(battleId);

  if (!isPostBattleChoicePending()) {
    scheduleBattleReturnStuckGuard();
  }
}

function presentBattleFleeResult(payload: BattleFinishPresentationPayload): void {
  if (combatFinishedPresenting || battleEndHandled) return;

  clearBattleFinishSafety();
  clearPendingBattleLoot();

  const penalty = payload.surrenderVoltPenalty ?? 0;
  const fleePresentation: BattleFinishPresentationPayload = {
    battleId: payload.battleId,
    victory: false,
    xpGain: 0,
    loot: null,
    lootReveal: buildEmptyLootRevealSlots(),
    endReason: 'FORFEIT',
    battleType: payload.battleType ?? resolveBattleTypeForPresentation(
      payload,
      resolveDispatchForFinish(payload.battleId),
      pendingBattleEndedPayload,
    ),
    ...(payload.rankingResult !== undefined ? { rankingResult: payload.rankingResult } : {}),
    ...(penalty > 0 ? { surrenderVoltPenalty: penalty } : {}),
  };

  try {
    emitPostBattleUiReady(fleePresentation);
  } catch (error) {
    console.error('[HUD] Falha ao exibir fuga da batalha:', error);
    const ended = pendingBattleEndedPayload;
    const exitPayload: BattleEndedPayload =
      ended && ended.battleId === payload.battleId
        ? ended
        : {
            battleId: payload.battleId,
            victory: false,
            monsterInstanceId: '',
            lootGranted: false,
            endReason: 'FORFEIT',
            xpGain: 0,
            ...(penalty > 0 ? { surrenderVoltPenalty: penalty } : {}),
          };
    unfreezeBattleInput();
    combatFinishedPresenting = false;
    void presentPostBattleHubFallback(fleePresentation, exitPayload);
  } finally {
    forfeitInFlight = false;
    postSystemNotification('Fuga registrada.', 'high');
  }
}

function forceBattleFinishFromSafety(): void {
  releaseCombatActionLock();

  const ended = pendingBattleEndedPayload;
  if (ended) {
    beginBattleFinishFlow(buildFinishPayloadFromBattleEnded(ended, peekPendingBattleLoot()));
    return;
  }

  const battleId =
    lastEndedDispatch?.state.battleId
    ?? lastDispatch?.state.battleId
    ?? activeBattleId;

  if (!battleId) {
    unfreezeBattleInput();
    combatFinishedPresenting = false;
    return;
  }

  openPostBattleHubForBattle(battleId);
}

function freezeBattleInput(): void {
  battleInputFrozen = true;
  battleCommand?.lock();
  battleItems?.lock();
  document.querySelector('#scene-combat')?.classList.add('is-battle-input-frozen');
}

function unfreezeBattleInput(): void {
  battleInputFrozen = false;
  dismissBattleSurrenderConfirm();
  document.querySelector('#scene-combat')?.classList.remove('is-battle-input-frozen');
}

/** Libera paleta após resposta do servidor ou erro de combate. */
export function releaseCombatActionLock(): void {
  combatActionPending = false;
  const dispatch = lastDispatch;
  if (!battleInputFrozen && dispatch) {
    GameClient.renderState(dispatch.state, dispatch.ui);
  }
}

/** Desbloqueia após combat-error em tentativa de fuga. */
export function releaseForfeitInFlight(): void {
  forfeitInFlight = false;
  releaseCombatActionLock();
}

const battleController = new BattleController({
  getBattleScreen: () => battleScreen,
});

let combatFeedbackOrchestrator: ReturnType<typeof initCombatFeedbackOrchestrator> | null = null;
let combatConnectionUnsub: (() => void) | null = null;

function restoreCombatVitalsFromSnapshot(dispatch: CombatDispatchPayload): void {
  GameClient.renderState(dispatch.state, dispatch.ui);
  const screen = getBattleScreen();
  if (!screen) return;

  for (const [id, combatant] of Object.entries(dispatch.state.combatants)) {
    screen.commitCombatantHp(id, resolveCombatantHp(combatant));
  }
}

/** Restaura HP do último snapshot e interrompe animações (desconexão / combat-error). */
export function abortCombatFeedbackOnDisconnect(): void {
  const orchestrator = combatFeedbackOrchestrator;
  if (!orchestrator?.isAnimating()) return;

  orchestrator.abortAndRestoreFromLastSnapshot();
  ensureHud().endStatusPlayback();
  getCombatTurnGateway()?.setExtraBlocked(false);
  releaseCombatActionLock();
}

function ensureCombatFeedbackPipeline(root?: ParentNode): ReturnType<typeof initCombatFeedbackOrchestrator> {
  const orchestrator = combatFeedbackOrchestrator ?? initCombatFeedbackOrchestrator({
    getBattleController: () => battleController,
    onSegmentConsumed: (event) => {
      ensureHud().consume(event);
    },
    onRestoreSnapshot: restoreCombatVitalsFromSnapshot,
  });
  combatFeedbackOrchestrator = orchestrator;
  const mountRoot = root ?? (typeof document !== 'undefined' ? document : undefined);
  if (mountRoot && !getCombatTurnGateway()) {
    initCombatTurnGateway(orchestrator.executionQueue, mountRoot, getPendingIntentRegistry());
  }
  if (!combatConnectionUnsub) {
    combatConnectionUnsub = subscribeConnectionPhase((phase) => {
      if (phase === 'disconnected' || phase === 'reconnecting') {
        abortCombatFeedbackOnDisconnect();
      }
    });
  }
  return orchestrator;
}

function isCombatFeedbackBlocking(): boolean {
  return (combatFeedbackOrchestrator?.isAnimating() ?? false)
    || combatActionPending
    || getPendingIntentRegistry().isCombatVfxAnimating()
    || Boolean(getCombatTurnGateway()?.isBlocked());
}

/** Aguarda a fila de animações de combate (testes / sincronização). */
export function flushCombatSequence(): Promise<void> {
  return combatFeedbackOrchestrator?.whenIdle() ?? Promise.resolve();
}

export function isCombatSequenceProcessing(): boolean {
  return combatFeedbackOrchestrator?.isAnimating() ?? false;
}

export type CombatClientConfig = {
  /** Ex.: `(action) => socket.emit('combat-action', action)` */
  readonly emitAction?: (action: ActionRequest) => void;
  /** Ex.: `(battleId) => socket.send('combat-forfeit', { battleId })` */
  readonly emitForfeit?: (battleId: string) => void;
  /** Callback após fade de saída da batalha (volta ao mapa). */
  readonly onBattleEnded?: () => void;
};

export function configureCombatClient(config: CombatClientConfig = {}): void {
  emitCombatAction = config.emitAction;
  emitCombatForfeit = config.emitForfeit;
  onBattleEnded = config.onBattleEnded;
}

export function initBattleHud(root: ParentNode = document): HUDManager {
  installBattleFinishDebugGlobal();
  initBattleStore();

  ensureCombatFeedbackPipeline(root);

  teardownBattleScreenUi?.();
  teardownBattleScreenUi = initBattleScreenUI(root, {
    onMoveset: () => {
      root.querySelector('#skill-palette-row')?.classList.remove('hidden');
    },
    onSkipTurn: () => {
      const dispatch = lastDispatch;
      if (!dispatch) return;
      GameClient.sendAction({
        battleId: dispatch.state.battleId,
        actorId: dispatch.ui.playerActorId,
        turn: dispatch.state.turn,
        skillId: null,
        requestId: `skip-${Date.now()}`,
      });
    },
    onSurrender: () => {
      if (battleInputFrozen || forfeitInFlight) return;
      showBattleSurrenderConfirm(() => {
        GameClient.sendForfeit();
      });
    },
  });

  const actions =
    root.querySelector<HTMLElement>('#skill-palette-row')
    ?? root.querySelector<HTMLElement>('[data-hud-skill-actions]')
    ?? root.querySelector<HTMLElement>('#battle-command-row');

  initTurnStateGuard(root);
  getTurnStateGuard().setOnChoiceWindowExpired(() => {
    if (battleInputFrozen) return;
    combatActionPending = true;
    battleCommand?.lock();
    battleItems?.lock();
    getTurnStateGuard().syncFromDispatch(
      lastDispatch?.state ?? {
        battleId: '',
        turn: 0,
        phase: 'RESOLVING',
        activeActorId: null,
        combatants: {},
      },
      lastDispatch?.ui ?? {
        actionsEnabled: false,
        activeActorId: null,
        playerActorId: 'player',
      },
    );
  });

  battleScreen = new BattleScreen(queryBattleScreenElements(root));

  if (actions) {
    battleCommand = new BattleCommandController({
      menuContainer: actions,
      onExecuteMove: (skillId, actorId) => {
        GameClient.sendSkillChoice(skillId, actorId);
      },
    });
  }

  const itemsDrawer =
    root.querySelector<HTMLElement>('#battle-items-row')
    ?? root.querySelector<HTMLElement>('[data-hud-battle-items]');
  if (itemsDrawer) {
    battleItems = new BattleItemsController({
      menuContainer: itemsDrawer,
      onUseItem: (itemId, actorId) => {
        GameClient.sendConsumableChoice(itemId, actorId);
      },
    });
  }

  hud = new HUDManager({
    elements: {
      root: root.querySelector<HTMLElement>('[data-battle-hud]'),
      actions,
      log: root.querySelector('#battle-log'),
    },
    battleScreen,
    ...(battleCommand ? { battleCommand } : {}),
    ...(battleItems ? { battleItems } : {}),
    onSkillClick: (skillId, actorId) => {
      GameClient.sendSkillChoice(skillId, actorId);
    },
  });

  initPostBattleHubBridge({
    isBlocked: () => battleEndHandled,
    onPresenting: (battleId) => {
      finishFlowBattleId = battleId;
      combatFinishedPresenting = true;
    },
    releaseInput: releasePostBattleInput,
    clearSafety: clearBattleFinishSafety,
    removeHubUi: removePostBattleHubUi,
    getCombatDispatch: resolveDispatchForFinish,
    getBattleLootContext: resolveBattleLootContext,
    onExit: async (payload) => {
      clearBattleLootPackages();
      clearPendingBattleLoot();
      destroyActiveLootCasino();
      await completeBattleExit(buildExitPayloadFromVictoryUi(payload));
      combatFinishedPresenting = false;
    },
  });

  return hud;
}

export function getBattleScreen(): BattleScreen | null {
  return battleScreen;
}

export function getBattleController(): BattleController {
  return battleController;
}

/** Monta BattleScreen com props (≈ `<BattleScreen monsterId onBattleFinished />`). */
export function mountBattleScreen(options: BattleScreenMountOptions): void {
  battleMount = options;
  mountBattleScreenView(
    { monsterId: options.monsterId, onBattleFinished: options.onBattleFinished },
  );
  battleScreen?.bindMonsterId(options.monsterId);
}

export function unmountBattleScreen(): void {
  battleMount = null;
  unmountBattleScreenView();
  battleScreen?.reset();
  resetTurnStateGuard();
}

export function getBattleMount(): BattleScreenMountOptions | null {
  return battleMount;
}

export function getLastDispatch(): CombatDispatchPayload | null {
  return lastDispatch;
}

export function getLastCombatState(): CombatState | null {
  return lastDispatch?.state ?? null;
}

/** Nova batalha (WS START_COMBAT ou battleId diferente) — zera flags de fim da luta anterior. */
export function registerActiveBattleId(battleId: string): void {
  if (activeBattleId !== battleId) {
    prepareNextBattle();
  }
  activeBattleId = battleId;
  refreshCombatDevBindings();
}

export function prepareNextBattle(): void {
  combatDispatchGeneration += 1;
  setBattlePlaybackClosing(false);
  setCombatActionPlaybackActive(false);
  battleEndHandled = false;
  combatFinishedPresenting = false;
  pendingBattleEndedPayload = null;
  finishFlowBattleId = null;
  activeBattleId = null;
  forfeitInFlight = false;
  lastEndedDispatch = null;
  clearBattleFinishSafety();
  clearBattleReturnStuckTimer();
  resetPostBattleHubBridgeSession();
  removePostBattleHubUi();
  resetBattleHonorStatsStore();
  clearBattleReportSession();
  unfreezeBattleInput();
  lastDispatch = null;
  clearPendingBattleLoot();
  clearBattleLootPackages();
  clearBattleLootStageSession();
  clearCombatFeedbackSession();
  resetVfxProjectileManager();
  getCombatTurnGateway()?.setExtraBlocked(false);
}

export function clearBattleSessionUi(): void {
  hud?.clearBattleSessionUi();
  unmountBattleScreenView();
  battleCommand?.lock();
  battleItems?.lock();
  battleScreen?.reset();
  resetTurnStateGuard();
  rootHideBattleDrawers();
}

export function getBattleHud(): HUDManager | null {
  return hud;
}

function rootHideBattleDrawers(): void {
  document.querySelector('#skill-palette-row')?.classList.add('hidden');
  document.querySelector('#battle-items-row')?.classList.add('hidden');
}

function ensureHud(): HUDManager {
  if (!hud) {
    hud = new HUDManager({ elements: {} });
  }
  return hud;
}

export const GameClient = {
  /** Limpa HUD, cache de skills e snapshot (uso em testes / troca de batalha). */
  reset(): void {
    combatDispatchGeneration += 1;
    setBattlePlaybackClosing(false);
    setCombatActionPlaybackActive(false);
    combatConnectionUnsub?.();
    combatConnectionUnsub = null;
    resetCombatFeedbackOrchestrator();
    resetCombatTurnGateway();
    resetVfxProjectileManager();
    combatFeedbackOrchestrator = null;
    hud?.clearSkillCache();
    battleCommand?.destroy();
    battleCommand = null;
    battleItems?.destroy();
    battleItems = null;
    battleScreen?.reset();
    teardownBattleScreenUi?.();
    teardownBattleScreenUi = null;
    resetBattleStore();
    resetTurnStateGuard();
    hud = null;
    battleScreen = null;
    battleMount = null;
    lastDispatch = null;
    lastEndedDispatch = null;
    battleEndHandled = false;
    combatFinishedPresenting = false;
    pendingBattleEndedPayload = null;
    finishFlowBattleId = null;
    activeBattleId = null;
    forfeitInFlight = false;
    clearBattleFinishSafety();
    clearBattleReturnStuckTimer();
    resetPostBattleHubBridgeSession();
    removePostBattleHubUi();
    clearBattleLootPackages();
  },

  /** Catálogo sincronizado via SKILL_CATALOG para um ator. */
  getSkillCache(actorId: string): readonly { id: string; name: string }[] {
    return hud?.getSkillCache(actorId) ?? [];
  },

  /**
   * Handler único para o canal `combat-event` do WebSocket.
   * Eventos entram na fila sequencial; snapshot final após a fila esvaziar.
   */
  handleCombatDispatch(data: CombatDispatchPayload): void {
    if (battleEndHandled && getGameStateManager().isExploration()) return;

    if (activeBattleId !== null && activeBattleId !== data.state.battleId) {
      prepareNextBattle();
      activeBattleId = data.state.battleId;
    } else if (activeBattleId === null) {
      activeBattleId = data.state.battleId;
    }

    const dispatchGeneration = combatDispatchGeneration + 1;
    combatDispatchGeneration = dispatchGeneration;

    lastDispatch = data;
    getGameStore().resolveFromCombatEvents(data.events);
    const hudManager = ensureHud();
    const statusBaseline = hudManager.getLastTurn()?.combatants ?? data.state.combatants;
    hudManager.beginStatusPlayback(statusBaseline, data.ui.playerActorId);
    rememberEndedDispatch(data);
    syncPetStoreFromCombatEvents(data.events);
    ingestBattleHonorStats(data.state.combatants, data.events);
    ingestBattleStatsReport(data.state, data.ui.playerActorId, data.events);

    const turnGuard = getTurnStateGuard();
    for (const event of data.events) {
      turnGuard.onCombatEvent(event, data.ui.playerActorId);
    }
    turnGuard.syncFromDispatch(data.state, data.ui);

    if (data.state.phase === 'RESOLVING' || data.events.some((e) => e.type === CombatEventType.DAMAGE_DEALT)) {
      battleCommand?.lock();
      battleItems?.lock();
    }

    const finishedEvent = data.events.find((e) => e.type === CombatEventType.COMBAT_FINISHED);
    const combatFinishedPayload =
      finishedEvent?.type === CombatEventType.COMBAT_FINISHED ? finishedEvent.payload : null;

    getCombatTurnGateway()?.setExtraBlocked(true);
    setCombatActionPlaybackActive(true);

    void raceCombatPlayback(ensureCombatFeedbackPipeline().playDispatch(data)).then(() => {
      setCombatActionPlaybackActive(false);
      getCombatTurnGateway()?.setExtraBlocked(false);
      ensureCombatFeedbackPipeline().flushDeferredPaletteEvents();
      hudManager.endStatusPlayback();
      const isLatestDispatch = dispatchGeneration === combatDispatchGeneration;
      if (!isLatestDispatch) {
        return;
      }
      if (battleEndHandled) return;

      releaseCombatActionLock();
      const shouldRenderSnapshot =
        data.state.phase === 'ENDED' || !combatFinishedPresenting;
      if (shouldRenderSnapshot) {
        GameClient.renderState(data.state, data.ui);
      }
      void finalizeBattleFinishAfterPlayback(data, combatFinishedPayload);
    }).catch((error) => {
      setCombatActionPlaybackActive(false);
      getCombatTurnGateway()?.setExtraBlocked(false);
      ensureCombatFeedbackPipeline().flushDeferredPaletteEvents();
      hudManager.endStatusPlayback();
      logCriticalBattleError('combat-dispatch', error);
      releaseCombatActionLock();
      if (data.state.phase === 'ENDED' && !battleEndHandled) {
        openPostBattleHubForBattle(data.state.battleId);
      }
    });
  },

  /** Ponto de entrada da HUD para enviar intenções ao motor. */
  sendAction(action: ActionRequest): void {
    if (battleInputFrozen || isCombatFeedbackBlocking()) return;
    if (!getGameStore().hasPendingAction(action.requestId)) {
      getGameStore().performServerAction(action.requestId, 'combat-command', () => {});
    }
    combatActionPending = true;
    battleCommand?.lock();
    battleItems?.lock();
    if (emitCombatAction) {
      emitCombatAction(action);
      return;
    }
    console.log('[HUD] Action (sem socket configurado):', action);
    releaseCombatActionLock();
  },

  sendForfeit(): void {
    if (forfeitInFlight) return;
    if (battleInputFrozen) {
      alertSystem('Não é possível fugir neste momento.');
      return;
    }
    const battleId = lastDispatch?.state.battleId ?? activeBattleId;
    if (!battleId) {
      alertSystem('Aguarde o servidor iniciar a batalha.');
      return;
    }
    forfeitInFlight = true;
    battleCommand?.lock();
    battleItems?.lock();
    if (emitCombatForfeit) {
      emitCombatForfeit(battleId);
      return;
    }
    console.log('[HUD] Forfeit (sem socket configurado):', battleId);
    forfeitInFlight = false;
  },

  sendSkillChoice(
    skillId: string,
    _actorIdFromClick: string,
    targetTile?: { readonly x: number; readonly y: number },
  ): void {
    if (battleInputFrozen || isCombatFeedbackBlocking()) {
      console.warn('[HUD] sendSkillChoice ignorado — input congelado ou feedback em andamento.');
      return;
    }
    if (!getTurnStateGuard().canUseSkill()) {
      getTurnStateGuard().rejectSkillAttempt();
      return;
    }
    const dispatch = lastDispatch;
    if (!dispatch) {
      console.warn('[HUD] sendSkillChoice ignorado — aguardando combat-event do servidor.');
      return;
    }
    const { state, ui } = dispatch;
    if (!ui.actionsEnabled || state.phase !== 'CHOOSING') {
      getTurnStateGuard().rejectSkillAttempt();
      return;
    }
    if (ui.turnDeadlineMs !== undefined && Date.now() > ui.turnDeadlineMs) {
      console.warn('[HUD] sendSkillChoice ignorado — janela de turno expirada.');
      return;
    }
    const player = state.combatants[ui.playerActorId];
    const serverHasSkill = player?.skills.some((entry) => entry.id === skillId) ?? false;
    const loadoutHasSkill = getBattleStore().getActiveMovesets().includes(skillId);
    if (!serverHasSkill && !loadoutHasSkill) {
      console.warn('[HUD] Movimento não autorizado pelo servidor:', skillId);
      return;
    }
    const action: ActionRequest = {
      battleId: state.battleId,
      actorId: ui.playerActorId,
      turn: state.turn,
      skillId,
      requestId: createCorrelationId(),
      ...(targetTile !== undefined ? { targetTile } : {}),
    };
    GameClient.sendAction(action);
  },

  sendConsumableChoice(consumableId: string, _actorIdFromClick: string): void {
    if (battleInputFrozen) return;
    const dispatch = lastDispatch;
    if (!dispatch) {
      console.warn('[HUD] sendConsumableChoice ignorado — aguardando combat-event do servidor.');
      return;
    }
    const { state, ui } = dispatch;
    if (!ui.actionsEnabled || state.phase !== 'CHOOSING') {
      return;
    }
    if (ui.turnDeadlineMs !== undefined && Date.now() > ui.turnDeadlineMs) {
      return;
    }
    const player = state.combatants[ui.playerActorId];
    const hasConsumable = player?.activeConsumables?.some(
      (row) => row.itemId === consumableId && row.quantity > 0,
    ) ?? false;
    if (!hasConsumable) {
      console.warn('[HUD] Consumível não autorizado pelo snapshot:', consumableId);
      return;
    }

    rootHideBattleDrawers();

    const action: ActionRequest = {
      battleId: state.battleId,
      actorId: ui.playerActorId,
      turn: state.turn,
      skillId: null,
      consumableId,
      requestId: createCorrelationId(),
    };

    GameClient.sendAction(action);
  },

  /** Aplica eventos do servidor/gateway na paleta e barras. */
  consumeCombatEvents(events: readonly CombatEvent[]): void {
    const manager = ensureHud();
    for (const event of events) {
      manager.consume(event);
    }
  },

  /**
   * Fim autoritativo da batalha — servidor emite após phase ENDED.
   * Exibe overlay de resultado; só retorna ao mapa quando o jogador confirmar.
   */
  handleBattleEnded(payload: BattleEndedPayload): void {
    console.log('DEBUG: Evento recebido em GameClient.handleBattleEnded', {
      battleId: payload.battleId,
      victory: payload.victory,
    });
    if (battleEndHandled) return;
    if (activeBattleId && activeBattleId !== payload.battleId) return;
    pendingBattleEndedPayload = payload;
    stagePostBattleLootIfVictory(payload);
  },

  /**
   * Atualiza snapshot (HP + paleta) após processar eventos.
   * Proxy UI: repinta botões a partir de combatants (cache só como fallback).
   */
  renderState(state: CombatState, ui: CombatUiHints): void {
    const manager = hud ?? ensureHud();
    const paintHpOnDom = !isCombatSequenceProcessing();
    manager.syncCombatantsFromState(state.combatants, ui.playerActorId, paintHpOnDom);
    manager.syncSkillPaletteFromCombatState(state, ui);
    getTurnStateGuard().syncFromDispatch(state, ui);

    for (const [combatantId, combatant] of Object.entries(state.combatants)) {
      battleController.syncPortraitOverlays(combatantId, combatant);
    }

  },
};

/**
 * Handler robusto para o canal `combat-event` (API de um argumento).
 * @example registerCombatSocketHandler(socket);
 */
export function registerCombatSocketHandler(
  socket: import('./combatSocketHandler.js').CombatSocket,
): void {
  attachCombatSocketListener(socket, gameClientCombatBridge(GameClient));
}
