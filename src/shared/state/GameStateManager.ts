import type { BattleEncounterData, BattleFinishedPayload, ExplorationSnapshot, GameState } from '../game/gameState.js';
import { GameState as GameStateValue } from '../game/gameState.js';
import {
  GAME_STATE_TRANSITION_MS,
  resolveTransitionDelayMs,
  sleepMs,
} from '../game/gameStateContext.js';

export type GameStateListener = (state: GameState) => void;

export type BattleEndResult = {
  readonly encounter: BattleEncounterData;
  readonly victory: boolean;
  readonly rewards?: BattleFinishedPayload['rewards'];
};

export type GameStatePersistence = {
  saveExplorationSnapshot(snapshot: ExplorationSnapshot): void;
  getExplorationSnapshot(): ExplorationSnapshot | null;
  setActiveEncounter(encounter: BattleEncounterData | null): void;
  clearActiveEncounter(): void;
};

export type GameStateTransitionHooks = {
  readonly persistence: GameStatePersistence;
  readonly onTransitionStart: () => void | Promise<void>;
  readonly onTransitionEnd: () => void | Promise<void>;
  readonly onEnterBattle: () => void | Promise<void>;
  readonly onEnterExploration: () => void | Promise<void>;
  readonly onPauseExploration: () => void;
  readonly onResumeExploration: (snapshot: ExplorationSnapshot) => void;
  readonly onClearBattleSession: () => void;
  readonly requestCombatJoin: (encounter: BattleEncounterData) => void;
  readonly onBattleVictory?: (encounter: BattleEncounterData) => void;
  readonly captureExplorationSnapshot: () => ExplorationSnapshot;
  readonly transitionDelayMs?: number;
};

type TransitionHooks = Pick<
  GameStateTransitionHooks,
  'onTransitionStart' | 'onTransitionEnd' | 'transitionDelayMs'
>;

/**
 * Pub/Sub central — EXPLORATION | BATTLE | TRANSITIONING.
 *
 * Ao sair de EXPLORATION, commit TRANSITIONING desmonta o WorldMap na árvore DOM
 * (via `applyGameStateToScenes` / GameRoot) antes do delay de fade.
 */
export class GameStateManager {
  private state: GameState = GameStateValue.Exploration;
  private readonly listeners = new Set<GameStateListener>();
  private transitionLock = false;

  subscribe(listener: GameStateListener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  getState(): GameState {
    return this.state;
  }

  isExploration(): boolean {
    return this.state === GameStateValue.Exploration;
  }

  isBattle(): boolean {
    return this.state === GameStateValue.Battle;
  }

  isTransitioning(): boolean {
    return this.state === GameStateValue.Transitioning;
  }

  /** Batalha ativa ou fade de transição — movimento deve ser bloqueado no cliente. */
  isInCombat(): boolean {
    return this.isBattle() || this.isTransitioning();
  }

  acceptsPlayerInput(): boolean {
    return !this.isInCombat();
  }

  /** Movimento WASD/setas/numpad — só fora de combate/transição. */
  acceptsMovementInput(): boolean {
    return this.acceptsPlayerInput();
  }

  setGameState(next: GameState): void {
    if (this.transitionLock) return;
    this.commitState(next);
  }

  /**
   * EXPLORATION → TRANSITIONING (desmonta WorldMap) → delay → BATTLE.
   */
  async startBattle(
    encounter: BattleEncounterData,
    hooks: GameStateTransitionHooks,
  ): Promise<boolean> {
    if (this.transitionLock || this.state === GameStateValue.Battle) {
      return false;
    }

    this.transitionLock = true;
    try {
      await this.enterTransition(hooks, async () => {
        const snapshot = hooks.captureExplorationSnapshot();
        hooks.persistence.saveExplorationSnapshot(snapshot);
        hooks.persistence.setActiveEncounter(encounter);
        hooks.onPauseExploration();

        await this.waitTransitionDelay(hooks);

        await hooks.onEnterBattle();
        hooks.requestCombatJoin(encounter);
        this.commitState(GameStateValue.Battle);
      });
      return true;
    } finally {
      this.transitionLock = false;
    }
  }

  /** @deprecated Use startBattle */
  async triggerBattle(
    encounter: BattleEncounterData,
    hooks: GameStateTransitionHooks,
  ): Promise<boolean> {
    return this.startBattle(encounter, hooks);
  }

  /**
   * BATTLE → TRANSITIONING → delay → EXPLORATION (remonta WorldMap).
   */
  async endBattle(result: BattleEndResult, hooks: GameStateTransitionHooks): Promise<void> {
    const lockAcquired = await this.waitForTransitionLock(2400);
    if (!lockAcquired) {
      await this.forceExitToExploration(hooks, result);
      return;
    }

    this.transitionLock = true;
    try {
      await this.enterTransition(hooks, async () => {
        hooks.onClearBattleSession();

        if (result.victory) {
          hooks.onBattleVictory?.(result.encounter);
        }

        hooks.persistence.clearActiveEncounter();

        await this.waitTransitionDelay(hooks);

        const snapshot = hooks.persistence.getExplorationSnapshot();
        hooks.onEnterExploration();

        if (snapshot) {
          hooks.onResumeExploration(snapshot);
        }

        this.commitState(GameStateValue.Exploration);
      });
    } finally {
      this.transitionLock = false;
    }
  }

  async enterBattleFromServer(hooks: GameStateTransitionHooks): Promise<void> {
    if (this.state === GameStateValue.Battle || this.transitionLock) return;

    this.transitionLock = true;
    try {
      await this.enterTransition(hooks, async () => {
        const snapshot = hooks.captureExplorationSnapshot();
        hooks.persistence.saveExplorationSnapshot(snapshot);
        hooks.onPauseExploration();
        await this.waitTransitionDelay(hooks);
        await hooks.onEnterBattle();
        this.commitState(GameStateValue.Battle);
      });
    } finally {
      this.transitionLock = false;
    }
  }

  reset(): void {
    this.transitionLock = false;
    this.commitState(GameStateValue.Exploration);
  }

  /** TRANSITIONING + overlay; ouvintes desmontam WorldMap imediatamente. */
  private async enterTransition(
    hooks: TransitionHooks,
    work: () => void | Promise<void>,
  ): Promise<void> {
    this.commitState(GameStateValue.Transitioning);
    await hooks.onTransitionStart();
    try {
      await work();
    } finally {
      await hooks.onTransitionEnd();
    }
  }

  private async waitTransitionDelay(hooks: TransitionHooks): Promise<void> {
    await sleepMs(resolveTransitionDelayMs(hooks));
  }

  private async waitForTransitionLock(maxWaitMs: number): Promise<boolean> {
    const stepMs = 50;
    let waited = 0;
    while (this.transitionLock && waited < maxWaitMs) {
      await sleepMs(stepMs);
      waited += stepMs;
    }
    return !this.transitionLock;
  }

  /** Fallback quando outra transição segura o lock — evita ficar preso na cena de combate. */
  private async forceExitToExploration(
    hooks: GameStateTransitionHooks,
    result: BattleEndResult,
  ): Promise<void> {
    hooks.onClearBattleSession();
    if (result.victory) {
      hooks.onBattleVictory?.(result.encounter);
    }
    hooks.persistence.clearActiveEncounter();
    hooks.onEnterExploration();
    const snapshot = hooks.persistence.getExplorationSnapshot();
    if (snapshot) {
      hooks.onResumeExploration(snapshot);
    }
    this.commitState(GameStateValue.Exploration);
  }

  private commitState(next: GameState): void {
    if (this.state === next) return;
    this.state = next;
    for (const listener of this.listeners) {
      listener(next);
    }
  }
}

let singleton: GameStateManager | null = null;

export function getGameStateManager(): GameStateManager {
  if (!singleton) singleton = new GameStateManager();
  return singleton;
}

export function resetGameStateManager(): void {
  singleton?.reset();
  singleton = null;
}

export { GAME_STATE_TRANSITION_MS };
