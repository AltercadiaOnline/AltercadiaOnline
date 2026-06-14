import { logCriticalBattleError } from './combatSafeExecution.js';

export type CombatAnimationAction = () => Promise<void>;

/**
 * Fila genérica de ações assíncronas — base para sequências de combate.
 * Garante execução estritamente serial (uma animação por vez).
 */
export class CombatAnimator {
  private queue: CombatAnimationAction[] = [];
  private isProcessing = false;
  private idleWaiters: Array<() => void> = [];

  get processing(): boolean {
    return this.isProcessing || this.queue.length > 0;
  }

  public async enqueue(action: CombatAnimationAction): Promise<void> {
    this.queue.push(action);
    this.kickProcessor();
    await this.whenIdle();
  }

  /** Enfileira várias ações de uma vez — evita janela vazia antes do process(). */
  public async enqueueMany(actions: readonly CombatAnimationAction[]): Promise<void> {
    if (actions.length === 0) return;
    for (const action of actions) {
      this.queue.push(action);
    }
    this.kickProcessor();
    await this.whenIdle();
  }

  /** Garante que a fila continue após enqueue concorrente (ex.: vários combat-event). */
  private kickProcessor(): void {
    if (!this.isProcessing) {
      void this.process();
    }
  }

  /** Aguarda até a fila esvaziar (útil em testes). */
  whenIdle(): Promise<void> {
    if (!this.processing) return Promise.resolve();
    return new Promise((resolve) => {
      this.idleWaiters.push(resolve);
    });
  }

  clear(): void {
    this.queue.length = 0;
    this.isProcessing = false;
    this.flushIdleWaiters();
  }

  private async process(): Promise<void> {
    this.isProcessing = true;
    try {
      while (this.queue.length > 0) {
        const action = this.queue.shift();
        if (!action) continue;
        try {
          await action();
        } catch (error) {
          logCriticalBattleError('feedback-queue', error);
        }
      }
    } finally {
      this.isProcessing = false;
      this.flushIdleWaiters();
    }
  }

  private flushIdleWaiters(): void {
    const waiters = this.idleWaiters.splice(0);
    for (const resolve of waiters) resolve();
  }

  /** Helper para criar delay entre ações. */
  public static wait(ms: number): Promise<void> {
    if (ms <= 0) return Promise.resolve();
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }
}
