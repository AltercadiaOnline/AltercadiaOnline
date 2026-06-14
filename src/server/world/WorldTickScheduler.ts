/**
 * Loop fixo de simulação/sincronização do mundo — emite callback por tick.
 */
export class WorldTickScheduler {
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly tickMs: number,
    private readonly onTick: () => void,
  ) {}

  start(): void {
    if (this.timer !== null) return;
    this.timer = setInterval(() => {
      try {
        this.onTick();
      } catch (error) {
        console.error('[WorldTick] Erro no tick:', error);
      }
    }, this.tickMs);
  }

  stop(): void {
    if (this.timer === null) return;
    clearInterval(this.timer);
    this.timer = null;
  }
}
