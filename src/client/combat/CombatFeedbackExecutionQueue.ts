import type { CombatDispatchPayload } from '../../shared/combatWire.js';
import type { CombatActionIntentResultData } from '../../shared/combat/combatIntentFeedback.js';
import type { CombatFeedbackPipelineStep } from '../../shared/combat/combatVisualFeedback.js';
import type { DamageDealtEvent } from '../../shared/events.js';
import { AnimationQueue } from './AnimationQueue.js';

export type CombatFeedbackJob = {
  readonly id: string;
  readonly actionResult: CombatActionIntentResultData;
  readonly snapshot: CombatDispatchPayload;
  readonly damageEvent?: DamageDealtEvent;
  readonly visualSteps?: readonly CombatFeedbackPipelineStep[];
};

export type CombatFeedbackJobHandler = (job: CombatFeedbackJob) => Promise<void>;

/**
 * Fila Gateway de feedback — enfileira objetos autoritativos do servidor em série.
 */
export class CombatFeedbackExecutionQueue {
  private readonly inner = new AnimationQueue();
  private jobSequence = 0;
  private lastSnapshot: CombatDispatchPayload | null = null;

  get isAnimating(): boolean {
    return this.inner.isProcessing;
  }

  get isEmpty(): boolean {
    return this.inner.isEmpty;
  }

  getLastSnapshot(): CombatDispatchPayload | null {
    return this.lastSnapshot;
  }

  subscribe(listener: (animating: boolean) => void): () => void {
    return this.inner.subscribe(listener);
  }

  rememberSnapshot(snapshot: CombatDispatchPayload): void {
    this.lastSnapshot = snapshot;
  }

  enqueueFeedbackJob(
    job: Omit<CombatFeedbackJob, 'id'>,
    handler: CombatFeedbackJobHandler,
  ): Promise<void> {
    this.lastSnapshot = job.snapshot;
    const id = `combat-fb-${this.jobSequence += 1}`;
    return this.inner.enqueue(() => handler({ ...job, id }));
  }

  whenIdle(): Promise<void> {
    return this.inner.whenIdle();
  }

  /** Tarefa visual sem juice compacto (segmentos sem actionResult). */
  enqueueVisualTask(task: () => Promise<void>): Promise<void> {
    return this.inner.enqueue(task);
  }

  /** Interrompe animações pendentes (ex.: desconexão). */
  abort(): void {
    this.inner.clear();
  }

  clear(): void {
    this.abort();
    this.lastSnapshot = null;
  }
}
