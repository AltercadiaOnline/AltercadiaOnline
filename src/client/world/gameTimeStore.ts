import {
  buildGameTimeAnchor,
  interpolateGameTimeSeconds,
  type GameTimeAnchor,
} from '../../shared/world/gameTime.js';

type GameTimeListener = (interpolatedSeconds: number) => void;

const DEFAULT_ANCHOR = buildGameTimeAnchor(525, 0);

export class GameTimeStore {
  private anchor: GameTimeAnchor = DEFAULT_ANCHOR;
  private readonly listeners = new Set<GameTimeListener>();

  getAnchor(): GameTimeAnchor {
    return this.anchor;
  }

  /** Âncora autoritativa recebida do Gateway (gameTime + serverTimeMs). */
  applyAnchor(gameTimeSeconds: number, serverTimeMs: number): void {
    this.anchor = buildGameTimeAnchor(gameTimeSeconds, serverTimeMs);
    this.notify();
  }

  /** Tempo interpolado com base no timestamp de recepção — não gera relógio próprio. */
  getInterpolatedGameTime(nowMs: number = Date.now()): number {
    return interpolateGameTimeSeconds(this.anchor, nowMs);
  }

  subscribe(listener: GameTimeListener): () => void {
    this.listeners.add(listener);
    listener(this.getInterpolatedGameTime());
    return () => {
      this.listeners.delete(listener);
    };
  }

  reset(): void {
    this.anchor = DEFAULT_ANCHOR;
    this.notify();
  }

  private notify(): void {
    const seconds = this.getInterpolatedGameTime();
    for (const listener of this.listeners) {
      listener(seconds);
    }
  }
}

let store: GameTimeStore | null = null;

export function getGameTimeStore(): GameTimeStore {
  if (!store) store = new GameTimeStore();
  return store;
}

export function resetGameTimeStore(): void {
  store = null;
}
