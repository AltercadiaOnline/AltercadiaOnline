import { exactOptionalProps } from '../../shared/util/exactOptionalProps.js';
import type { CombatActionIntentFeedback } from '../../shared/combat/combatIntentFeedback.js';
import type { CombatFeedbackStep } from '../../shared/combat/combatVisualFeedback.js';
import type { DamageDealtEvent } from '../../shared/events.js';
import type { BattleController } from './BattleController.js';
import type { BattleScreen } from '../hud/battleScreen.js';
import { playCombatImpactSound } from './combatFeedbackSound.js';
import { logCriticalBattleError } from './combatSafeExecution.js';

const SHAKE_MS: Record<string, number> = {
  none: 0,
  low: 180,
  medium: 280,
  high: 420,
};

const BATTLE_SCENE_SELECTOR = '#scene-combat';
const BATTLE_ARENA_SELECTOR = '.battle-arena';

function waitMs(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function resolveBattleScene(root?: ParentNode): HTMLElement | null {
  const scope = root ?? (typeof document !== 'undefined' ? document : null);
  return scope?.querySelector<HTMLElement>(BATTLE_SCENE_SELECTOR) ?? null;
}

/** Juice (shake/flash/hit-stop) só na arena — não tremer HUD, moveset nem chat. */
function resolveBattleJuiceHost(root?: ParentNode): HTMLElement | null {
  const scope = root ?? (typeof document !== 'undefined' ? document : null);
  return (
    scope?.querySelector<HTMLElement>(BATTLE_ARENA_SELECTOR)
    ?? resolveBattleScene(root)
  );
}

function impactParticleClass(impactType: string): string {
  return `combat-impact--${impactType.toLowerCase()}`;
}

export type CombatFeedbackPipelineContext = {
  readonly feedback: CombatActionIntentFeedback;
  readonly root?: ParentNode;
  readonly damageEvent?: DamageDealtEvent;
  readonly visualSteps?: readonly CombatFeedbackStep[];
  readonly getBattleController?: () => BattleController;
  readonly getBattleScreen?: () => BattleScreen | null;
  /** Projétil já reproduziu som/hit-stop/flash — segue para HP/shake. */
  readonly skipIntroPhases?: boolean;
};

function clearJuiceClasses(scene: HTMLElement): void {
  scene.classList.remove(
    'combat-hit-stop',
    'combat-shake--low',
    'combat-shake--medium',
    'combat-shake--high',
    'combat-impact--normal',
    'combat-impact--heavy',
    'combat-impact--critical',
    'combat-impact--block',
    'combat-impact--heal',
    'combat-flash--active',
  );
  scene.removeAttribute('data-combat-impact');
}

/** Pipeline autoritativo: Som → HitStop → Flash → Animação de Dano → Shake. */
export async function runCombatFeedbackPipeline(context: CombatFeedbackPipelineContext): Promise<void> {
  const juiceHost = resolveBattleJuiceHost(context.root);
  const { feedback } = context;

  try {
    if (!context.skipIntroPhases) {
      // 1. Som
      await playCombatImpactSound(feedback.impactType);

      if (!juiceHost) {
        await runDamageAnimationPhase(context);
        return;
      }

      // 2. HitStop
      if (feedback.hitStopDuration > 0) {
        juiceHost.classList.add('combat-hit-stop');
        await waitMs(feedback.hitStopDuration);
        juiceHost.classList.remove('combat-hit-stop');
      }

      // 3. Flash
      juiceHost.dataset.combatImpact = feedback.impactType;
      juiceHost.classList.add(impactParticleClass(feedback.impactType));
      juiceHost.classList.add('combat-flash--active');
      const flashTargetId = context.damageEvent?.payload.targetId
        ?? context.damageEvent?.payload.sourceId;
      const screen = context.getBattleScreen?.();
      if (flashTargetId && screen) {
        await screen.playCombatCue(flashTargetId, feedback.impactType === 'HEAL' ? 'heal' : 'hit');
      } else {
        await waitMs(120);
      }
      juiceHost.classList.remove('combat-flash--active');
    } else if (!juiceHost) {
      await runDamageAnimationPhase(context);
      return;
    }

    // 4. Animação de dano
    await runDamageAnimationPhase(context);

    // 5. Shake da câmera
    const shakeClass = feedback.cameraShake !== 'none'
      ? `combat-shake--${feedback.cameraShake}`
      : null;
    if (shakeClass && juiceHost) {
      juiceHost.classList.add(shakeClass);
      await waitMs(SHAKE_MS[feedback.cameraShake] ?? 200);
      juiceHost.classList.remove(shakeClass);
    }

    if (juiceHost) {
      window.setTimeout(() => {
        juiceHost.classList.remove(impactParticleClass(feedback.impactType));
        juiceHost.removeAttribute('data-combat-impact');
      }, 320);
    }
  } catch (error) {
    logCriticalBattleError('feedback-pipeline', error);
  } finally {
    if (juiceHost) clearJuiceClasses(juiceHost);
  }
}

async function runDamageAnimationPhase(context: CombatFeedbackPipelineContext): Promise<void> {
  const controller = context.getBattleController?.();
  const steps = context.visualSteps ?? [];
  if (!controller || steps.length === 0) return;

  for (const step of steps) {
    try {
      if (step.kind === 'wait') {
        await controller.playFeedbackStep(step);
        continue;
      }
      if (step.kind === 'portrait_stance' && step.stance === 'attack') {
        continue;
      }
      await controller.playFeedbackStep(step, exactOptionalProps({ damageEvent: context.damageEvent }));
    } catch (error) {
      logCriticalBattleError('battle-controller', error);
    }
  }
}

export function abortCombatFeedbackPipeline(root?: ParentNode): void {
  const juiceHost = resolveBattleJuiceHost(root);
  if (!juiceHost) return;
  clearJuiceClasses(juiceHost);
}
