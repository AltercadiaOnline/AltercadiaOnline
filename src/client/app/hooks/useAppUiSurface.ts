import { useSyncExternalStore } from 'react';
import { GameState as GameStateValue, type GameState } from '../../../shared/game/gameState.js';
import { getGameStateManager } from '../../../shared/state/GameStateManager.js';
import { getAppScreenBridge, type AppScreenId } from '../bridge/appScreenBridge.js';
import { subscribeExternalStore } from './subscribeExternalStore.js';

/**
 * Superfície UI — fonte única para “estamos no mundo?”.
 * Lê `appScreenBridge` (mesmo objeto que `showScreen`), não Zustand `inGame`.
 */
export function useActiveScreen(): AppScreenId {
  return useSyncExternalStore(
    (onStoreChange) =>
      subscribeExternalStore(
        (listener) => getAppScreenBridge().subscribe(listener),
        onStoreChange,
      ),
    () => getAppScreenBridge().snapshot().activeScreen,
    () => 'login-screen',
  );
}

export function useIsInGame(): boolean {
  return useActiveScreen() === 'game-container';
}

/** Fase autoritativa exploração/batalha — espelho do GameStateManager. */
export function useGamePhase(): GameState {
  return useSyncExternalStore(
    (onStoreChange) =>
      subscribeExternalStore(
        (listener) => getGameStateManager().subscribe(() => listener()),
        onStoreChange,
      ),
    () => getGameStateManager().getState(),
    () => GameStateValue.Exploration,
  );
}

export function useIsExplorationHud(): boolean {
  const inGame = useIsInGame();
  const phase = useGamePhase();
  return inGame && phase === GameStateValue.Exploration;
}

export type HudViewMode = 'world' | 'battle';

export function useHudViewMode(): HudViewMode {
  const phase = useGamePhase();
  // TRANSITIONING também é batalha: não remontar o World HUD no fade
  // (isso desmontava vitals/moveset e deixava só o canvas da arena).
  return phase === GameStateValue.Exploration ? 'world' : 'battle';
}
