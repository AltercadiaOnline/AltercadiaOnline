import { clampFrameDeltaMs } from '../../shared/world/movement.js';

export type GameRenderLoopHandlers = {
  readonly shouldRun: () => boolean;
  readonly onUpdate: (deltaMs: number) => void;
  readonly onPrepare: (deltaMs: number) => void;
  readonly onRender: (timestampMs: number) => void;
};

/**
 * Loop autoritativo via requestAnimationFrame — sincronizado com o refresh do monitor.
 */
const IDLE_POLL_MS = 250;

export class GameRenderLoop {
  private rafId = 0;
  private idlePollId = 0;
  private lastTimestampMs = 0;
  private running = false;

  start(handlers: GameRenderLoopHandlers): void {
    if (this.running) return;
    this.running = true;
    this.lastTimestampMs = 0;

    const scheduleFrame = (): void => {
      if (!this.running) return;
      this.rafId = requestAnimationFrame(tick);
    };

    const scheduleIdlePoll = (): void => {
      if (!this.running || this.idlePollId !== 0) return;
      const schedule = typeof globalThis.setTimeout === 'function'
        ? globalThis.setTimeout.bind(globalThis)
        : setTimeout;
      this.idlePollId = schedule(() => {
        this.idlePollId = 0;
        scheduleFrame();
      }, IDLE_POLL_MS) as unknown as number;
    };

    const tick = (timestampMs: number): void => {
      if (!this.running) return;
      this.rafId = 0;

      if (!handlers.shouldRun()) {
        this.lastTimestampMs = timestampMs;
        scheduleIdlePoll();
        return;
      }

      const rawDelta = this.lastTimestampMs > 0 ? timestampMs - this.lastTimestampMs : 16.67;
      const deltaMs = clampFrameDeltaMs(rawDelta);
      this.lastTimestampMs = timestampMs;

      handlers.onUpdate(deltaMs);
      handlers.onPrepare(deltaMs);
      handlers.onRender(timestampMs);
      scheduleFrame();
    };

    scheduleFrame();
  }

  stop(): void {
    this.running = false;
    if (this.rafId !== 0) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
    if (this.idlePollId !== 0) {
      const clear = typeof globalThis.clearTimeout === 'function'
        ? globalThis.clearTimeout.bind(globalThis)
        : clearTimeout;
      clear(this.idlePollId);
      this.idlePollId = 0;
    }
    this.lastTimestampMs = 0;
  }

  isRunning(): boolean {
    return this.running;
  }
}

let sharedLoop: GameRenderLoop | null = null;

export function getGameRenderLoop(): GameRenderLoop {
  if (!sharedLoop) sharedLoop = new GameRenderLoop();
  return sharedLoop;
}

export function resetGameRenderLoop(): void {
  sharedLoop?.stop();
  sharedLoop = null;
}
