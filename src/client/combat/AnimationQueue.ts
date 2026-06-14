import { logCriticalBattleError } from './combatSafeExecution.js';

export type AnimationQueueTask = () => Promise<void>;

export type AnimationQueueListener = (processing: boolean) => void;

/**
 * Fila serial de animações — uma por vez, bloqueia input enquanto não estiver vazia.
 */
export class AnimationQueue {
  private queue: AnimationQueueTask[] = [];
  private processing = false;
  private idleWaiters: Array<() => void> = [];
  private readonly listeners = new Set<AnimationQueueListener>();

  get isEmpty(): boolean {
    return !this.processing && this.queue.length === 0;
  }

  get isProcessing(): boolean {
    return !this.isEmpty;
  }

  subscribe(listener: AnimationQueueListener): () => void {
    this.listeners.add(listener);
    listener(this.isProcessing);
    return () => this.listeners.delete(listener);
  }

  async enqueue(task: AnimationQueueTask): Promise<void> {
    this.queue.push(task);
    this.notifyListeners();
    this.kickProcessor();
    await this.whenIdle();
  }

  async enqueueMany(tasks: readonly AnimationQueueTask[]): Promise<void> {
    if (tasks.length === 0) return;
    for (const task of tasks) {
      this.queue.push(task);
    }
    this.notifyListeners();
    this.kickProcessor();
    await this.whenIdle();
  }

  whenIdle(): Promise<void> {
    if (this.isEmpty) return Promise.resolve();
    return new Promise((resolve) => {
      this.idleWaiters.push(resolve);
    });
  }

  clear(): void {
    this.queue.length = 0;
    this.processing = false;
    this.notifyListeners();
    this.flushIdleWaiters();
  }

  private kickProcessor(): void {
    if (!this.processing) {
      void this.process();
    }
  }

  private async process(): Promise<void> {
    this.processing = true;
    this.notifyListeners();
    try {
      while (this.queue.length > 0) {
        const task = this.queue.shift();
        if (!task) continue;
        try {
          await task();
        } catch (error) {
          logCriticalBattleError('feedback-queue', error);
        }
      }
    } finally {
      this.processing = false;
      this.notifyListeners();
      this.flushIdleWaiters();
    }
  }

  private flushIdleWaiters(): void {
    const waiters = this.idleWaiters.splice(0);
    for (const resolve of waiters) resolve();
  }

  private notifyListeners(): void {
    const busy = this.isProcessing;
    for (const listener of this.listeners) {
      listener(busy);
    }
  }
}
