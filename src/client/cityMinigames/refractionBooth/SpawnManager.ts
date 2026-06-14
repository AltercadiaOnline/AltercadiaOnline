export type SpawnManagerOptions = {
  readonly spawnMinMs: number;
  readonly spawnMaxMs: number;
  readonly maxConcurrent: number;
  readonly getActiveCount: () => number;
  readonly onSpawn: () => void;
};

/** Gera alvos em intervalos aleatórios respeitando limite de concorrência. */
export class SpawnManager {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private stopped = true;

  constructor(private readonly options: SpawnManagerOptions) {}

  start(): void {
    this.stop();
    this.stopped = false;
    this.scheduleNext();
  }

  stop(): void {
    this.stopped = true;
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private scheduleNext(): void {
    if (this.stopped) return;

    const { spawnMinMs, spawnMaxMs } = this.options;
    const delay =
      spawnMinMs +
      Math.floor(Math.random() * Math.max(1, spawnMaxMs - spawnMinMs + 1));

    this.timer = setTimeout(() => {
      this.timer = null;
      if (this.stopped) return;

      if (this.options.getActiveCount() < this.options.maxConcurrent) {
        this.options.onSpawn();
      }

      this.scheduleNext();
    }, delay);
  }
}
