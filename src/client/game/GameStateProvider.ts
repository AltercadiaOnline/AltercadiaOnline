import { LoadingScreen } from '../ui/LoadingScreen.js';
import { enterBattleWithFade, syncGameScenesToCurrentState } from '../browser/sceneManager.js';
import type { BattleEndReason } from '../../shared/combat/battleEnded.js';
import {
  resolveEncounterForBattleExit,
  type ReturnToExplorationOptions,
} from './battleReturnToWorld.js';
import { getPlayerPetStore } from '../ui/pet/playerPetStore.js';
import { getGlobalPlayerStore } from '../ui/moveset/globalPlayerStore.js';
import { CITY_01_ID } from '../../shared/world/maps/city01.js';
import { buildBattleEncounter } from '../../shared/world/monsterRegistry.js';
import type { BattleEncounterData, BattleFinishedPayload, GameState } from '../../shared/game/gameState.js';
import type { GameStateContextType } from '../../shared/game/gameStateContext.js';
import {
  getGameStateManager,
  resetGameStateManager,
  type BattleEndResult,
  type GameStateListener,
  type GameStateTransitionHooks,
} from '../../shared/state/GameStateManager.js';
import { uiEvents, UIEventType } from '../ui/uiEvents.js';
import {
  clearBattleSessionUi,
  lockBattleHudInput,
  prepareNextBattle,
} from '../hud/index.js';
import {
  registerBattleReturnBridge,
  unregisterBattleReturnBridge,
} from './battleReturnToWorld.js';
import { handleBattleDefeatPenalty } from '../progression/deathPenaltyClient.js';
import { getMarcoCombatTelemetry } from '../progression/marcoCombatTelemetry.js';
import { persistBattleEndVitals } from './battleVitalsPersistence.js';
import type { ExplorationSnapshot } from '../../shared/game/gameState.js';

export type GameStateProviderDeps = {
  readonly onPauseExploration: () => void;
  readonly onResumeExploration: (snapshot: ExplorationSnapshot) => void;
  readonly captureExplorationSnapshot: () => ExplorationSnapshot;
  readonly requestCombatJoin: (encounter: BattleEncounterData) => void;
  readonly onEnterExplorationVisual?: () => void;
};

let providerHooks: GameStateTransitionHooks | null = null;
let offBattleFinished: (() => void) | null = null;
let loadingScreen: LoadingScreen | null = null;
let pendingBattleEnd: BattleEndResult | null = null;

function buildPersistence() {
  const store = getGlobalPlayerStore();
  return {
    saveExplorationSnapshot: (snapshot: ExplorationSnapshot) => store.saveExplorationSnapshot(snapshot),
    getExplorationSnapshot: () => store.getExplorationSnapshot(),
    setActiveEncounter: (encounter: BattleEncounterData | null) => store.setActiveEncounter(encounter),
    clearActiveEncounter: () => store.clearActiveEncounter(),
  };
}

function buildContext(): GameStateContextType {
  const manager = getGameStateManager();
  return {
    gameState: manager.getState(),
    setGameState: (state) => manager.setGameState(state),
    startBattle: (monsterId) => { void startBattle(monsterId); },
    endBattle: () => { void endBattleFromContext(); },
  };
}

/**
 * GameStateProvider — equivalente vanilla ao React Context Provider.
 * Inicializa pub/sub, DOM e hooks de transição.
 */
export function initGameStateProvider(deps: GameStateProviderDeps): () => void {
  loadingScreen = new LoadingScreen(document.getElementById('scene-transition'));

  providerHooks = {
    persistence: buildPersistence(),
    onTransitionStart: async () => {
      lockBattleHudInput();
      loadingScreen?.show();
    },
    onTransitionEnd: async () => {
      loadingScreen?.hide();
    },
    onEnterBattle: async () => {
      await enterBattleWithFade();
    },
    onEnterExploration: () => {
      deps.onEnterExplorationVisual?.();
    },
    onPauseExploration: deps.onPauseExploration,
    onResumeExploration: deps.onResumeExploration,
    onClearBattleSession: () => {
      clearBattleSessionUi();
      prepareNextBattle();
    },
    requestCombatJoin: deps.requestCombatJoin,
    onBattleVictory: () => {
      /* Despawn autoritativo via BATTLE_ENDED — evita duplicar remoção no cliente. */
    },
    captureExplorationSnapshot: deps.captureExplorationSnapshot,
  };

  registerBattleReturnBridge(providerHooks, returnToExplorationFromBattle);

  offBattleFinished?.();
  offBattleFinished = uiEvents.on(UIEventType.BATTLE_FINISHED, (payload) => {
    if (getGameStateManager().isExploration()) return;

    getPlayerPetStore().applyBattleAffinityReward(payload.victory);
    getMarcoCombatTelemetry().flushAfterBattle(payload.victory);

    pendingBattleEnd = {
      encounter: payload.encounter,
      victory: payload.victory,
      rewards: payload.rewards,
    };
    void endBattleWithResult(pendingBattleEnd);
  });

  return () => {
    unregisterBattleReturnBridge();
    offBattleFinished?.();
    offBattleFinished = null;
    providerHooks = null;
    pendingBattleEnd = null;
    loadingScreen?.destroy();
    loadingScreen = null;
    resetGameStateManager();
  };
}

/** Snapshot do contexto — use useGameStateContext para reatividade. */
export function getGameStateContext(): GameStateContextType {
  return buildContext();
}

/** useGameState — subscribe ao estado atual. */
export function useGameState(listener: GameStateListener): () => void {
  return getGameStateManager().subscribe(listener);
}

/** useGameStateContext — entrega GameStateContextType a cada transição. */
export function useGameStateContext(listener: (ctx: GameStateContextType) => void): () => void {
  return getGameStateManager().subscribe(() => {
    listener(buildContext());
  });
}

export function getGameState(): GameState {
  return getGameStateManager().getState();
}

export function setGameState(state: GameState): void {
  getGameStateManager().setGameState(state);
}

export function gameStateAcceptsInput(): boolean {
  return getGameStateManager().acceptsPlayerInput();
}

export async function startBattle(monsterId: string): Promise<boolean> {
  const encounter = buildBattleEncounter(monsterId);
  if (!encounter || !providerHooks) return false;

  prepareNextBattle();
  getPlayerPetStore().markBattleAffinityBaseline();
  return getGameStateManager().startBattle(encounter, providerHooks);
}

/** @deprecated Use startBattle */
export async function triggerBattle(monsterId: string): Promise<boolean> {
  return startBattle(monsterId);
}

async function endBattleWithResult(result: BattleEndResult): Promise<void> {
  if (!providerHooks) return;
  await getGameStateManager().endBattle(result, providerHooks);
  pendingBattleEnd = null;
}

/** endBattle() — restaura exploração usando encontro ativo ou resultado pendente. */
export async function endBattleFromContext(): Promise<void> {
  if (!providerHooks) return;

  if (pendingBattleEnd) {
    await endBattleWithResult(pendingBattleEnd);
    return;
  }

  const encounter = getGlobalPlayerStore().getActiveEncounter();
  if (encounter) {
    await endBattleWithResult({ encounter, victory: false });
  }
}

export async function enterBattleFromServer(): Promise<void> {
  if (!providerHooks) return;
  await getGameStateManager().enterBattleFromServer(providerHooks);
}

/**
 * Transição autoritativa BATTLE → EXPLORATION (mapa top-down).
 * Chamado ao confirmar o overlay de fim / rendição.
 */
export async function returnToExplorationFromBattle(
  options: ReturnToExplorationOptions,
): Promise<void> {
  const hooks = providerHooks;
  if (!hooks) {
    console.warn('[GameState] returnToExplorationFromBattle sem provider');
    return;
  }

  const manager = getGameStateManager();
  if (manager.isExploration()) {
    hooks.onEnterExploration();
    const snap = hooks.persistence.getExplorationSnapshot();
    if (snap) hooks.onResumeExploration(snap);
    syncGameScenesToCurrentState();
    return;
  }

  if (!manager.isBattle() && !manager.isTransitioning()) {
    syncGameScenesToCurrentState();
    return;
  }

  const resolved =
    resolveEncounterForBattleExit(options.monsterId)
    ?? (options.monsterId ? buildBattleEncounter(options.monsterId) : null);
  const snap = hooks.persistence.getExplorationSnapshot();
  const encounter: BattleEncounterData = resolved ?? {
    monsterId: options.monsterId ?? 'unknown',
    monsterName: 'Inimigo',
    mapId: snap?.mapId ?? CITY_01_ID,
    tileX: 0,
    tileY: 0,
    creatureId: 'rat',
  };

  persistBattleEndVitals();
  if (!options.victory && options.endReason !== 'FORFEIT') {
    handleBattleDefeatPenalty();
  }

  getPlayerPetStore().applyBattleAffinityReward(options.victory);
  getMarcoCombatTelemetry().flushAfterBattle(options.victory);

  const rewards = { xpGained: 0, items: [], dollarVoltGained: 0 };
  await manager.endBattle({ encounter, victory: options.victory, rewards }, hooks);

  syncGameScenesToCurrentState();

  const payload: BattleFinishedPayload = { encounter, victory: options.victory, rewards };
  uiEvents.emit(UIEventType.BATTLE_FINISHED, payload);
}

/** Emite BATTLE_FINISHED com recompensas processadas (legado — prefira returnToExplorationFromBattle). */
export function publishBattleFinished(
  encounter: BattleEncounterData,
  victory: boolean,
  endReason?: import('../../shared/combat/battleEnded.js').BattleEndReason,
): void {
  persistBattleEndVitals();

  if (!victory && endReason !== 'FORFEIT') {
    handleBattleDefeatPenalty();
  }

  const rewards = victory
    ? { xpGained: 0, items: [], dollarVoltGained: 0 }
    : { xpGained: 0, items: [], dollarVoltGained: 0 };
  const payload: BattleFinishedPayload = { encounter, victory, rewards };
  uiEvents.emit(UIEventType.BATTLE_FINISHED, payload);
}

export { getGameStateManager, resetGameStateManager };
