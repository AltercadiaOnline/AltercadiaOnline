import { exactOptionalProps } from '../../shared/util/exactOptionalProps.js';
import {
  extractCombatActionIntentResult,
  type CombatActionIntentResultData,
} from '../../shared/combat/combatIntentFeedback.js';
import type { CombatDispatchPayload } from '../../shared/combatWire.js';
import {
  buildCombatVisualFeedback,
  type CombatFeedbackPipelineStep,
  type CombatVisualFeedback,
} from '../../shared/combat/combatVisualFeedback.js';
import { CombatEventType, type CombatEvent, type DamageDealtEvent } from '../../shared/events.js';

const PALETTE_DEFERRED_EVENT_TYPES = new Set<CombatEventType>([
  CombatEventType.TURN_START,
  CombatEventType.BATTLE_STATE_UPDATE,
  CombatEventType.SKILL_CATALOG,
  CombatEventType.PP_CHANGED,
  CombatEventType.COOLDOWN_UPDATED,
]);
import type { BattleController } from './BattleController.js';
import {
  CombatFeedbackExecutionQueue,
  type CombatFeedbackJob,
} from './CombatFeedbackExecutionQueue.js';
import {
  abortCombatFeedbackPipeline,
  runCombatFeedbackPipeline,
} from './combatFeedbackPipeline.js';
import {
  getVfxProjectileManager,
  isProjectileCombatAction,
} from './VfxProjectileManager.js';
import { logCriticalBattleError, runCombatSafeVoid } from './combatSafeExecution.js';

export type CombatFeedbackRestoreHandler = (snapshot: CombatDispatchPayload) => void;

export type CombatFeedbackOrchestratorOptions = {
  readonly getBattleController: () => BattleController;
  readonly onSegmentConsumed?: (event: CombatEvent) => void;
  readonly executionQueue?: CombatFeedbackExecutionQueue;
  readonly onRestoreSnapshot?: CombatFeedbackRestoreHandler;
};

function collectPipelineVisualSteps(
  feedback: CombatVisualFeedback,
  events: readonly CombatEvent[],
): { readonly steps: CombatFeedbackPipelineStep[]; readonly damageEvent?: DamageDealtEvent } {
  const steps: CombatFeedbackPipelineStep[] = [];
  let lastDamageEvent: DamageDealtEvent | undefined;

  for (const segment of feedback.segments) {
    const event = events[segment.eventIndex];
    const segmentDamageEvent =
      event?.type === CombatEventType.DAMAGE_DEALT ? event : undefined;
    if (segmentDamageEvent) {
      lastDamageEvent = segmentDamageEvent;
    }

    for (const step of segment.steps) {
      if (step.kind === 'portrait_stance' && step.stance === 'attack') continue;
      if (step.kind === 'portrait_cue' && step.cue === 'attack') continue;
      steps.push({
        step,
        ...(step.kind === 'damage_impact' && segmentDamageEvent
          ? { damageEvent: segmentDamageEvent }
          : {}),
      });
    }
  }

  return lastDamageEvent !== undefined ? { steps, damageEvent: lastDamageEvent } : { steps };
}

/**
 * Gateway de feedback — enfileira pacotes do servidor e executa o pipeline visual em série.
 */
export class CombatFeedbackOrchestrator {
  private readonly getBattleController: () => BattleController;
  private readonly onSegmentConsumed: (event: CombatEvent) => void;
  private readonly onRestoreSnapshot: CombatFeedbackRestoreHandler;
  readonly executionQueue: CombatFeedbackExecutionQueue;
  private root: ParentNode | undefined;
  private activeEvents: readonly CombatEvent[] = [];
  private deferredPaletteEvents: CombatEvent[] = [];

  constructor(options: CombatFeedbackOrchestratorOptions) {
    this.getBattleController = options.getBattleController;
    this.onSegmentConsumed = options.onSegmentConsumed ?? (() => {});
    this.onRestoreSnapshot = options.onRestoreSnapshot ?? (() => {});
    this.executionQueue = options.executionQueue ?? new CombatFeedbackExecutionQueue();
  }

  /** Compat — espelha a fila de execução para o CombatTurnGateway. */
  get queue(): CombatFeedbackExecutionQueue {
    return this.executionQueue;
  }

  isAnimating(): boolean {
    return this.executionQueue.isAnimating;
  }

  isPlaying(): boolean {
    return this.isAnimating();
  }

  whenIdle(): Promise<void> {
    return this.executionQueue.whenIdle();
  }

  clear(): void {
    this.executionQueue.clear();
    this.activeEvents = [];
    this.deferredPaletteEvents = [];
    abortCombatFeedbackPipeline(this.root);
  }

  /** Eventos de estado adiados — consumir após feedback visual (renderState). */
  flushDeferredPaletteEvents(): void {
    const events = this.deferredPaletteEvents.splice(0);
    for (const event of events) {
      this.onSegmentConsumed(event);
    }
  }

  resolveFeedback(payload: CombatDispatchPayload): CombatVisualFeedback {
    if (payload.feedback) return payload.feedback;
    return buildCombatVisualFeedback(payload.events, {
      playerActorId: payload.ui.playerActorId,
    });
  }

  /** IntentResult.data — enfileira job com pipeline completo. */
  async playActionResult(
    actionResult: CombatActionIntentResultData,
    root?: ParentNode,
  ): Promise<void> {
    if (root) this.root = root;

    const snapshot = this.executionQueue.getLastSnapshot();
    if (!snapshot) {
      if (isProjectileCombatAction(actionResult.action)) {
        await getVfxProjectileManager().playFromGatewayResult(
          actionResult,
          exactOptionalProps({ root: this.root }),
        );
        return;
      }
      await runCombatFeedbackPipeline(exactOptionalProps({
        feedback: actionResult.feedback,
        root: this.root,
        getBattleController: () => this.getBattleController(),
        getBattleScreen: () => this.getBattleController().getScreen(),
      }));
      return;
    }

    await this.executionQueue.enqueueFeedbackJob(
      {
        actionResult,
        snapshot,
        visualSteps: [],
      },
      (job) => this.runFeedbackJob(job),
    );
  }

  /** Reproduz feedback visual do pacote `combat-event` e consome segmentos ao concluir. */
  async playDispatch(payload: CombatDispatchPayload, root?: ParentNode): Promise<void> {
    if (root) this.root = root;
    this.executionQueue.rememberSnapshot(payload);

    const feedback = this.resolveFeedback(payload);
    this.activeEvents = payload.events;

    const visualIndices = new Set(feedback.segments.map((segment) => segment.eventIndex));
    this.deferredPaletteEvents = [];
    for (let index = 0; index < payload.events.length; index += 1) {
      if (visualIndices.has(index)) continue;
      const event = payload.events[index];
      if (!event) continue;
      if (PALETTE_DEFERRED_EVENT_TYPES.has(event.type)) {
        this.deferredPaletteEvents.push(event);
        continue;
      }
      this.onSegmentConsumed(event);
    }

    if (feedback.segments.length === 0) {
      this.flushDeferredPaletteEvents();
      return;
    }

    const actionResult = payload.actionResult ?? extractCombatActionIntentResult(payload.events);
    const { steps: visualSteps, damageEvent } = collectPipelineVisualSteps(feedback, payload.events);

    if (!actionResult) {
      await this.executionQueue.enqueueVisualTask(async () => {
        await this.runVisualOnlySteps(payload, visualSteps, damageEvent);
      });
      return;
    }

    await this.executionQueue.enqueueFeedbackJob(
      exactOptionalProps({
        actionResult,
        snapshot: payload,
        damageEvent,
        visualSteps,
      }),
      (job) => this.runFeedbackJob(job),
    );
  }

  /**
   * Interrompe a fila e restaura vitals do último snapshot autoritativo (desconexão).
   */
  abortAndRestoreFromLastSnapshot(): void {
    const snapshot = this.executionQueue.getLastSnapshot();
    this.executionQueue.abort();
    abortCombatFeedbackPipeline(this.root);

    if (snapshot) {
      this.onRestoreSnapshot(snapshot);
    }
  }

  private async runFeedbackJob(job: CombatFeedbackJob): Promise<void> {
    try {
      const projectilePlayed = await this.playProjectileIfNeeded(job);

      await runCombatFeedbackPipeline(exactOptionalProps({
        feedback: job.actionResult.feedback,
        root: this.root,
        damageEvent: job.damageEvent,
        visualSteps: job.visualSteps,
        getBattleController: () => this.getBattleController(),
        getBattleScreen: () => this.getBattleController().getScreen(),
        skipIntroPhases: projectilePlayed,
      }));

      const feedback = this.resolveFeedback(job.snapshot);
      for (const segment of feedback.segments) {
        const event = job.snapshot.events[segment.eventIndex];
        if (event) this.onSegmentConsumed(event);
      }
    } catch (error) {
      logCriticalBattleError('combat-dispatch', error);
    }
  }

  private async playProjectileIfNeeded(job: CombatFeedbackJob): Promise<boolean> {
    if (!isProjectileCombatAction(job.actionResult.action)) return false;

    const manager = getVfxProjectileManager();
    if (manager.shouldSkipDuplicate(job.actionResult)) return true;

    const hasDamageImpact = (job.visualSteps ?? []).some(
      (entry) => entry.step.kind === 'damage_impact',
    );

    const played = await manager.playFromGatewayResult(
      job.actionResult,
      exactOptionalProps({
        root: this.root,
        skipImpactEffects: hasDamageImpact,
      }),
    );
    return played;
  }

  private async runVisualOnlySteps(
    payload: CombatDispatchPayload,
    visualSteps: readonly CombatFeedbackPipelineStep[],
    damageEvent?: DamageDealtEvent,
  ): Promise<void> {
    await runCombatSafeVoid('battle-controller', async () => {
      const controller = this.getBattleController();
      for (const entry of visualSteps) {
        const stepDamageEvent = entry.damageEvent ?? damageEvent;
        await controller.playFeedbackStep(
          entry.step,
          stepDamageEvent !== undefined ? { damageEvent: stepDamageEvent } : undefined,
        );
      }

      const feedback = this.resolveFeedback(payload);
      for (const segment of feedback.segments) {
        const event = payload.events[segment.eventIndex];
        if (event) this.onSegmentConsumed(event);
      }
    });
  }
}

let activeOrchestrator: CombatFeedbackOrchestrator | null = null;

export function getCombatFeedbackOrchestrator(): CombatFeedbackOrchestrator {
  if (!activeOrchestrator) {
    activeOrchestrator = new CombatFeedbackOrchestrator({
      getBattleController: () => {
        throw new Error('CombatFeedbackOrchestrator não inicializado');
      },
    });
  }
  return activeOrchestrator;
}

export function initCombatFeedbackOrchestrator(
  options: CombatFeedbackOrchestratorOptions,
): CombatFeedbackOrchestrator {
  activeOrchestrator?.clear();
  activeOrchestrator = new CombatFeedbackOrchestrator(options);
  return activeOrchestrator;
}

export function isCombatFeedbackOrchestratorReady(): boolean {
  return activeOrchestrator !== null;
}

export function clearCombatFeedbackSession(): void {
  activeOrchestrator?.clear();
}

export function resetCombatFeedbackOrchestrator(): void {
  clearCombatFeedbackSession();
  activeOrchestrator = null;
}
