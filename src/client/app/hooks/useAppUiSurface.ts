// @ts-nocheck
import { useSyncExternalStore } from 'react';
import { GameState as GameStateValue } from '../../../shared/game/gameState.js';
import { getGameStateManager } from '../../../shared/state/GameStateManager.js';
import { getAppScreenBridge } from '../bridge/appScreenBridge.js';
import { subscribeExternalStore } from './subscribeExternalStore.js';
/**
 * Superfície UI — fonte única para “estamos no mundo?”.
 * Lê `appScreenBridge` (mesmo objeto que `showScreen`), não Zustand `inGame`.
 */
export function useActiveScreen() {
    return useSyncExternalStore((onStoreChange) => subscribeExternalStore((listener) => getAppScreenBridge().subscribe(listener), onStoreChange), () => getAppScreenBridge().snapshot().activeScreen, () => 'login-screen');
}
export function useIsInGame() {
    return useActiveScreen() === 'game-container';
}
/** Fase autoritativa exploração/batalha — espelho do GameStateManager. */
export function useGamePhase() {
    return useSyncExternalStore((onStoreChange) => subscribeExternalStore((listener) => getGameStateManager().subscribe(() => listener()), onStoreChange), () => getGameStateManager().getState(), () => GameStateValue.Exploration);
}
export function useIsExplorationHud() {
    const inGame = useIsInGame();
    const phase = useGamePhase();
    return inGame && phase === GameStateValue.Exploration;
}
export function useHudViewMode() {
    const phase = useGamePhase();
    return phase === GameStateValue.Battle ? 'battle' : 'world';
}
