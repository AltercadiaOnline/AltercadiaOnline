import { GameState as GameStateValue } from '../../../shared/game/gameState.js';
import type { GameState } from '../../../shared/game/gameState.js';
import { getGameStateManager } from '../../../shared/state/GameStateManager.js';
import { getGameStore, subscribeGameStore } from '../../state/GameStore.js';
import { getPlayerEquipmentStore } from '../../ui/equipment/playerEquipmentStore.js';
import { getAppScreenBridge } from '../bridge/appScreenBridge.js';
import { getHudBridge } from '../bridge/hudBridge.js';
import { getRenderLayerBridge } from '../bridge/renderLayerBridge.js';
import { getBattleHudController } from '../battle/BattleHudController.js';
import { resetBattleHudStoreSession } from '../battle/battleHudStore.js';
import {
  useGameStore,
  type ViewMode,
} from './gameStore.js';
import { useWorldPanelsStore } from './worldPanelsStore.js';

let teardownFns: Array<() => void> = [];

function resolveViewModeFromGameState(state: GameState): ViewMode {
  return state === GameStateValue.Exploration ? 'world' : 'battle';
}

function syncWorldHudActiveFromGameState(state: GameState): void {
  useGameStore.getState().setWorldHudActive(state === GameStateValue.Exploration);
}

function closeWorldPanelsIfLeavingExploration(state: GameState): void {
  if (state === GameStateValue.Exploration) return;
  useWorldPanelsStore.getState().closeAllPanels();
}

function syncPlayerDataFromAuthoritativeStores(): void {
  const equipment = getPlayerEquipmentStore().getSnapshot();
  const player = getGameStore().getState().player;

  useGameStore.getState().patchPlayerData({
    displayName: equipment.displayName,
    level: equipment.level,
    hpCurrent: equipment.vitals.hpCurrent,
    hpMax: equipment.vitals.hpMax,
    inventory: player.inventory,
    gold: player.gold,
  });
}

function syncBattleDataFromGameStore(): void {
  const battle = getGameStore().getState().battle;
  getBattleHudController().syncSessionFromGameStore(battle);
}

function syncInGameFromScreen(activeScreen: string): void {
  useGameStore.getState().setInGame(activeScreen === 'game-container');
}

function syncWorldHudActive(active: boolean): void {
  useGameStore.getState().setWorldHudActive(active);
}

function syncRenderEngine(): void {
  const { renderEngine } = getRenderLayerBridge().snapshot();
  useGameStore.getState().setRenderEngine(renderEngine);
}

function applyViewMode(state: GameState): void {
  useGameStore.getState().setViewMode(resolveViewModeFromGameState(state));
}

/**
 * Ponte legado → Zustand.
 * Mudanças no GameStateManager e GameStore propagam automaticamente para a UI React.
 */
export function initGameStoreBridge(): void {
  teardownGameStoreBridge();

  const initialState = getGameStateManager().getState();
  applyViewMode(initialState);
  syncWorldHudActiveFromGameState(initialState);
  syncInGameFromScreen(getAppScreenBridge().snapshot().activeScreen);
  syncWorldHudActive(getHudBridge().snapshot().gameHudActive);
  syncRenderEngine();
  syncPlayerDataFromAuthoritativeStores();
  syncBattleDataFromGameStore();

  teardownFns.push(
    getGameStateManager().subscribe((state) => {
      applyViewMode(state);
      syncWorldHudActiveFromGameState(state);
      closeWorldPanelsIfLeavingExploration(state);
    }),
  );

  teardownFns.push(
    getAppScreenBridge().subscribe((snapshot) => {
      syncInGameFromScreen(snapshot.activeScreen);
    }),
  );

  teardownFns.push(
    getHudBridge().subscribe((snapshot) => {
      syncWorldHudActive(snapshot.gameHudActive);
    }),
  );

  teardownFns.push(
    subscribeGameStore((_, slice) => {
      if (slice === 'player' || slice === '*') {
        syncPlayerDataFromAuthoritativeStores();
      }
      if (slice === 'battle' || slice === '*') {
        syncBattleDataFromGameStore();
      }
    }),
  );

  teardownFns.push(
    getPlayerEquipmentStore().subscribe(() => {
      syncPlayerDataFromAuthoritativeStores();
    }),
  );

  teardownFns.push(
    getRenderLayerBridge().subscribe(() => {
      syncRenderEngine();
    }),
  );
}

export function teardownGameStoreBridge(): void {
  for (const teardown of teardownFns) {
    teardown();
  }
  teardownFns = [];
}

export function resetGameUiStoreSession(): void {
  useGameStore.getState().resetSession();
  resetBattleHudStoreSession();
}

/** Sincronização manual — útil após bootstrap de sessão. */
export function syncGameUiStoreFromLegacy(): void {
  const state = getGameStateManager().getState();
  applyViewMode(state);
  syncWorldHudActiveFromGameState(state);
  syncInGameFromScreen(getAppScreenBridge().snapshot().activeScreen);
  syncWorldHudActive(getHudBridge().snapshot().gameHudActive);
  syncRenderEngine();
  syncPlayerDataFromAuthoritativeStores();
  syncBattleDataFromGameStore();
}

/** API imperativa para código legado que precise forçar viewMode (preferir GameStateManager). */
export function setGameUiViewMode(viewMode: ViewMode): void {
  useGameStore.getState().setViewMode(viewMode);
}

export function getGameUiViewMode(): ViewMode {
  return useGameStore.getState().viewMode;
}
