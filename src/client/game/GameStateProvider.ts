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
import { isMapId } from '../../shared/world/mapRegistry.js';
import { buildCitySafeSpawnPayload } from '../../shared/world/zoneTransition.js';
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
import { PENDING_COMBAT_JOIN_TIMEOUT_MS } from '../../shared/combat/pendingCombatJoinConstants.js';
import { sendCombatJoinAbort } from '../app/panels/combatJoinAbortBridge.js';
import {
  clearBattleSessionUi,
  prepareNextBattle,
} from '../combat/index.js';
import {
  registerBattleReturnBridge,
  unregisterBattleReturnBridge,
} from './battleReturnToWorld.js';
import { handleBattleDefeatPenalty } from '../progression/deathPenaltyClient.js';
import { getMarcoCombatTelemetry } from '../progression/marcoCombatTelemetry.js';
import { persistBattleEndVitals } from './battleVitalsPersistence.js';
import type { ExplorationSnapshot } from '../../shared/game/gameState.js';
import { getPveEncounterStore } from '../app/panels/pveEncounterStore.js';

export type GameStateProviderDeps = {
  readonly onPauseExploration: () => void;
  readonly onResumeExploration: (snapshot: ExplorationSnapshot) => void;
  readonly captureExplorationSnapshot: () => ExplorationSnapshot;
  readonly requestCombatJoin: (encounter: BattleEncounterData) => void;
  readonly onEnterExplorationVisual?: () => void;
};

/**
 * Estado compartilhado entre o bundle tsc (`/client`) e o React HUD (`/app-ui`).
 * Sem globalThis, a HUD chama beginPendingPveCombatJoin numa cópia sem hooks → "encontro inválido".
 */
type GameStateProviderSlot = {
  hooks: GameStateTransitionHooks | null;
  pendingCombatJoin: boolean;
  /** Epoch do join pendente — invalida timeout atrasado. */
  pendingCombatJoinEpoch: number;
  pendingCombatJoinTimer: ReturnType<typeof setTimeout> | null;
  pendingBattleEnd: BattleEndResult | null;
  offBattleFinished: (() => void) | null;
  loadingScreen: LoadingScreen | null;
};

type GlobalWithGameStateProvider = typeof globalThis & {
  __ALTERCADIA_GAME_STATE_PROVIDER__?: GameStateProviderSlot;
};

function getGameStateProviderSlot(): GameStateProviderSlot {
  const g = globalThis as GlobalWithGameStateProvider;
  if (!g.__ALTERCADIA_GAME_STATE_PROVIDER__) {
    g.__ALTERCADIA_GAME_STATE_PROVIDER__ = {
      hooks: null,
      pendingCombatJoin: false,
      pendingCombatJoinEpoch: 0,
      pendingCombatJoinTimer: null,
      pendingBattleEnd: null,
      offBattleFinished: null,
      loadingScreen: null,
    };
  } else {
    const existing = g.__ALTERCADIA_GAME_STATE_PROVIDER__;
    if (typeof existing.pendingCombatJoinEpoch !== 'number') {
      existing.pendingCombatJoinEpoch = 0;
    }
    if (existing.pendingCombatJoinTimer === undefined) {
      existing.pendingCombatJoinTimer = null;
    }
  }
  return g.__ALTERCADIA_GAME_STATE_PROVIDER__;
}

function clearPendingCombatJoinTimer(): void {
  const slot = getGameStateProviderSlot();
  if (slot.pendingCombatJoinTimer !== null) {
    clearTimeout(slot.pendingCombatJoinTimer);
    slot.pendingCombatJoinTimer = null;
  }
}

function schedulePendingCombatJoinTimeout(): void {
  const slot = getGameStateProviderSlot();
  clearPendingCombatJoinTimer();
  const epoch = slot.pendingCombatJoinEpoch;
  slot.pendingCombatJoinTimer = setTimeout(() => {
    const current = getGameStateProviderSlot();
    if (!current.pendingCombatJoin || current.pendingCombatJoinEpoch !== epoch) return;
    void abortPendingCombatJoinSilently('JOIN_TIMEOUT');
  }, PENDING_COMBAT_JOIN_TIMEOUT_MS);
}

function markPendingCombatJoinActive(): void {
  const slot = getGameStateProviderSlot();
  slot.pendingCombatJoin = true;
  slot.pendingCombatJoinEpoch += 1;
  schedulePendingCombatJoinTimeout();
}

function clearPendingCombatJoinState(): void {
  const slot = getGameStateProviderSlot();
  clearPendingCombatJoinTimer();
  slot.pendingCombatJoin = false;
}

const COMBAT_JOIN_ABORT_REASONS = new Set([
  'WORLD_LOGIN_REQUIRED',
  'ENCOUNTER_REQUIRED',
  'MONSTER_TOO_FAR',
  'MONSTER_NOT_FOUND',
  'MONSTER_UNAVAILABLE',
  'MONSTER_NOT_ACTIVE',
  'MONSTER_MAP_MISMATCH',
  'MISSING_MONSTER_INSTANCE',
  'NO_PENDING_ENCOUNTER',
  'JOIN_BATTLE_FAILED',
  'PROFILE_NOT_READY',
  'PLAYER_NOT_EXPLORING',
  'NO_SESSION',
  'INVALID_BATTLE',
  'INVALID_CHARACTER',
  'INVALID_INTENT',
  'BATTLE_SESSION_EXPIRED',
  'SERVER_ERROR',
  'INVALID_MESSAGE',
  'PAYLOAD_TOO_LARGE',
  'AUTH_REQUIRED',
  'AUTH_INVALID',
  'AUTH_MISMATCH',
  'DEV_ONLY',
]);

/**
 * Prefer mirror local; se AOI/seed ainda não tem o id, usa o offer da HUD
 * (servidor continua autoridade no join).
 */
function resolvePendingBattleEncounter(monsterInstanceId: string): BattleEncounterData | null {
  const fromMirror = buildBattleEncounter(monsterInstanceId);
  if (fromMirror) return fromMirror;

  const offer = getPveEncounterStore().getSnapshot().offer;
  if (!offer || offer.monsterInstanceId !== monsterInstanceId) return null;

  const snapMap = getGlobalPlayerStore().getExplorationSnapshot()?.mapId;
  const mapId = isMapId(offer.mapId)
    ? offer.mapId
    : (snapMap && isMapId(snapMap) ? snapMap : CITY_01_ID);

  return {
    monsterId: offer.monsterInstanceId,
    monsterName: offer.name.trim() || 'Inimigo',
    mapId,
    tileX: 0,
    tileY: 0,
    // Sem creatureId no offer = bug de dados; não inventar criatura ('' = desconhecida).
    creatureId: offer.creatureId.trim(),
  };
}

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
  const slot = getGameStateProviderSlot();
  slot.loadingScreen = new LoadingScreen(document.getElementById('scene-transition'));

  slot.hooks = {
    persistence: buildPersistence(),
    onTransitionStart: async () => {
      // Não lockar paleta aqui: no join local o 1º combat-event chega antes de BATTLE;
      // lock + unmount em TRANSITIONING deixava o moveset preso sem próximo evento.
      // Saída de batalha já trava via onClearBattleSession / clearBattleSessionUi.
      getGameStateProviderSlot().loadingScreen?.show();
    },
    onTransitionEnd: async () => {
      getGameStateProviderSlot().loadingScreen?.hide();
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
      // Mantém battleEndHandled até exitBattleToWorld confirmar EXPLORATION.
      prepareNextBattle({ keepEndHandled: true });
    },
    requestCombatJoin: deps.requestCombatJoin,
    onBattleVictory: () => {
      /* Despawn autoritativo via BATTLE_ENDED — evita duplicar remoção no cliente. */
    },
    captureExplorationSnapshot: deps.captureExplorationSnapshot,
  };

  registerBattleReturnBridge(slot.hooks, returnToExplorationFromBattle);

  slot.offBattleFinished?.();
  slot.offBattleFinished = uiEvents.on(UIEventType.BATTLE_FINISHED, (payload) => {
    if (getGameStateManager().isExploration()) return;

    getPlayerPetStore().applyBattleAffinityReward(payload.victory);
    getMarcoCombatTelemetry().flushAfterBattle(payload.victory);

    const runtime = getGameStateProviderSlot();
    runtime.pendingBattleEnd = {
      encounter: payload.encounter,
      victory: payload.victory,
      rewards: payload.rewards,
    };
    void endBattleWithResult(runtime.pendingBattleEnd);
  });

  return () => {
    const runtime = getGameStateProviderSlot();
    unregisterBattleReturnBridge();
    runtime.offBattleFinished?.();
    runtime.offBattleFinished = null;
    runtime.hooks = null;
    runtime.pendingBattleEnd = null;
    clearPendingCombatJoinState();
    runtime.loadingScreen?.destroy();
    runtime.loadingScreen = null;
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

export function isPendingCombatJoin(): boolean {
  return getGameStateProviderSlot().pendingCombatJoin;
}

/**
 * Aceite PVE (WS) — grava encontro e marca join pendente.
 * Não monta a tela de batalha (fail-closed até START_COMBAT).
 */
export function beginPendingPveCombatJoin(monsterInstanceId: string): boolean {
  const encounter = resolvePendingBattleEncounter(monsterInstanceId);
  const hooks = getGameStateProviderSlot().hooks;
  if (!encounter || !hooks) {
    console.warn('[GameState] beginPendingPveCombatJoin falhou', {
      hasEncounter: Boolean(encounter),
      hasHooks: Boolean(hooks),
      monsterInstanceId,
    });
    return false;
  }

  const slot = getGameStateProviderSlot();
  markPendingCombatJoinActive();
  prepareNextBattle();
  getPlayerPetStore().markBattleAffinityBaseline();

  const snapshot = hooks.captureExplorationSnapshot();
  hooks.persistence.saveExplorationSnapshot(snapshot);
  hooks.persistence.setActiveEncounter(encounter);
  return true;
}

/**
 * Pedido de join (legado / local) — prepara encontro + combat-join, sem montar Battle.
 */
export async function startBattle(monsterId: string): Promise<boolean> {
  const encounter = resolvePendingBattleEncounter(monsterId) ?? buildBattleEncounter(monsterId);
  const hooks = getGameStateProviderSlot().hooks;
  if (!encounter || !hooks) return false;

  markPendingCombatJoinActive();
  prepareNextBattle();
  getPlayerPetStore().markBattleAffinityBaseline();
  return getGameStateManager().prepareCombatJoin(encounter, hooks);
}

/** @deprecated Use startBattle */
export async function triggerBattle(monsterId: string): Promise<boolean> {
  return startBattle(monsterId);
}

async function endBattleWithResult(result: BattleEndResult): Promise<void> {
  const hooks = getGameStateProviderSlot().hooks;
  if (!hooks) return;
  const slot = getGameStateProviderSlot();
  clearPendingCombatJoinState();
  await getGameStateManager().endBattle(result, hooks);
  slot.pendingBattleEnd = null;
}

/** endBattle() — restaura exploração usando encontro ativo ou resultado pendente. */
export async function endBattleFromContext(): Promise<void> {
  if (!getGameStateProviderSlot().hooks) return;

  const pending = getGameStateProviderSlot().pendingBattleEnd;
  if (pending) {
    await endBattleWithResult(pending);
    return;
  }

  const encounter = getGlobalPlayerStore().getActiveEncounter();
  if (encounter) {
    await endBattleWithResult({ encounter, victory: false });
  }
}

export type EnterBattleFromServerOptions = {
  readonly monsterInstanceId?: string;
};

/** START_COMBAT — única porta para montar a tela de batalha (fora do Construct / React HUD). */
export async function enterBattleFromServer(
  options: EnterBattleFromServerOptions = {},
): Promise<void> {
  const hooks = getGameStateProviderSlot().hooks;
  if (!hooks) return;

  clearPendingCombatJoinState();
  getPveEncounterStore().setBusy(false);

  let encounter = getGlobalPlayerStore().getActiveEncounter();
  const monsterId = options.monsterInstanceId?.trim();
  if (monsterId) {
    encounter = resolvePendingBattleEncounter(monsterId)
      ?? buildBattleEncounter(monsterId)
      ?? encounter
      ?? {
        monsterId,
        monsterName: 'Inimigo',
        mapId: getGlobalPlayerStore().getExplorationSnapshot()?.mapId ?? CITY_01_ID,
        tileX: 0,
        tileY: 0,
        creatureId: '',
      };
  }

  await getGameStateManager().enterBattleFromServer(hooks, encounter);
}

/**
 * Falha de join — permanece no mundo (fail-closed).
 * Sem modal de cancelar; toast curto + limpeza local + abort no servidor se a sessão já existia.
 */
export async function abortPendingCombatJoinSilently(
  reason: 'JOIN_TIMEOUT' | 'START_COMBAT_REJECTED' | string = 'JOIN_TIMEOUT',
): Promise<void> {
  const slot = getGameStateProviderSlot();
  if (!slot.pendingCombatJoin && !getGameStateManager().isTransitioning()) {
    // Já limpo — ainda pede abort server-side se START_COMBAT atrasado.
    if (reason === 'START_COMBAT_REJECTED') {
      sendCombatJoinAbort(reason);
    }
    return;
  }

  clearPendingCombatJoinState();
  getPveEncounterStore().showTransientToast(
    reason === 'JOIN_TIMEOUT'
      ? 'Combate não iniciou — continue explorando.'
      : 'Não foi possível iniciar o combate.',
  );
  sendCombatJoinAbort(reason);

  if (!slot.hooks) {
    getGlobalPlayerStore().clearActiveEncounter();
    return;
  }

  await getGameStateManager().abortCombatJoin(slot.hooks);
  syncGameScenesToCurrentState();
}

/**
 * combat-error / join rejeitado — limpa busy e segue no mundo (sem entrar na batalha).
 */
export async function abortCombatJoinOnError(reason: string): Promise<void> {
  const manager = getGameStateManager();
  const inCombatUi = manager.isBattle() || manager.isTransitioning();
  const knownJoinFailure = COMBAT_JOIN_ABORT_REASONS.has(reason);
  const slot = getGameStateProviderSlot();

  if (!slot.pendingCombatJoin && !(inCombatUi && knownJoinFailure)) {
    getPveEncounterStore().setBusy(false);
    return;
  }

  clearPendingCombatJoinState();
  getPveEncounterStore().showTransientToast('Não foi possível iniciar o combate.');
  // Servidor pode ter criado sessão órfã no bootstrap — libera sem penalidade.
  sendCombatJoinAbort(reason);

  if (!slot.hooks) {
    getGlobalPlayerStore().clearActiveEncounter();
    return;
  }

  await getGameStateManager().abortCombatJoin(slot.hooks);
  syncGameScenesToCurrentState();
}

/**
 * Transição autoritativa BATTLE → EXPLORATION (mapa top-down).
 * Chamado ao confirmar o overlay de fim / rendição.
 */
export async function returnToExplorationFromBattle(
  options: ReturnToExplorationOptions,
): Promise<void> {
  const hooks = getGameStateProviderSlot().hooks;
  if (!hooks) {
    console.warn('[GameState] returnToExplorationFromBattle sem provider');
    return;
  }

  getGameStateProviderSlot().pendingCombatJoin = false;
  clearPendingCombatJoinTimer();

  // Derrota (não fuga) → centro da cidade (espelha respawn autoritativo do servidor).
  if (!options.victory && options.endReason !== 'FORFEIT') {
    const citySpawn = buildCitySafeSpawnPayload();
    if (isMapId(citySpawn.mapId)) {
      hooks.persistence.saveExplorationSnapshot({
        mapId: citySpawn.mapId,
        x: citySpawn.x,
        y: citySpawn.y,
        facing: citySpawn.facing ?? 'south',
      });
    }
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
    creatureId: '',
  };

  persistBattleEndVitals(
    options.endReason !== undefined ? { endReason: options.endReason } : undefined,
  );
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
  endReason?: BattleEndReason,
): void {
  persistBattleEndVitals(endReason !== undefined ? { endReason } : undefined);

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
