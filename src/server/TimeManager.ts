import {
  buildGameTimeAnchor,
  GAME_CYCLE_DURATION_MS,
  normalizeGameTimeSeconds,
  type GameTimeAnchor,
} from '../shared/world/gameTime.js';

export type TimeManagerOptions = {
  /** Segundos iniciais no ciclo [0, 1800). Padrão: 525s (~7h virtual). */
  readonly initialGameTimeSeconds?: number;
  readonly cycleDurationMs?: number;
};

/**
 * Relógio global autoritativo — ciclo de 1800s (30 min).
 * O cliente nunca avança o tempo; apenas interpola a partir das âncoras recebidas.
 */
export class TimeManager {
  private elapsedMs = 0;
  private readonly cycleDurationMs: number;

  constructor(options: TimeManagerOptions = {}) {
    const initialSeconds = options.initialGameTimeSeconds ?? 525;
    this.cycleDurationMs = options.cycleDurationMs ?? GAME_CYCLE_DURATION_MS;
    this.elapsedMs = normalizeGameTimeSeconds(initialSeconds) * 1000;
  }

  advance(deltaMs: number, serverTimeMs: number): GameTimeAnchor {
    if (deltaMs > 0) {
      this.elapsedMs = (this.elapsedMs + deltaMs) % this.cycleDurationMs;
    }
    return this.getAnchor(serverTimeMs);
  }

  getAnchor(serverTimeMs: number = Date.now()): GameTimeAnchor {
    const gameTimeSeconds = this.elapsedMs / 1000;
    return buildGameTimeAnchor(gameTimeSeconds, serverTimeMs);
  }

  getGameTimeSeconds(): number {
    return this.elapsedMs / 1000;
  }
}

let timeManager: TimeManager | null = null;

export function getTimeManager(): TimeManager {
  if (!timeManager) {
    timeManager = new TimeManager();
  }
  return timeManager;
}

export function resetTimeManager(): void {
  timeManager = null;
}
