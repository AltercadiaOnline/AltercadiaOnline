import type { GameState } from './gameState.js';

/** Contrato equivalente ao React Context — espelhado no cliente via GameStateProvider. */
export type GameStateContextType = {
  readonly gameState: GameState;
  setGameState(state: GameState): void;
  startBattle(monsterId: string): void;
  endBattle(): void;
};

/** Delay do estado TRANSITIONING — reserva tempo para fade futuro. */
export const GAME_STATE_TRANSITION_MS = 500;

export function resolveTransitionDelayMs(
  hooks: { readonly transitionDelayMs?: number },
): number {
  return hooks.transitionDelayMs ?? GAME_STATE_TRANSITION_MS;
}

export function sleepMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
