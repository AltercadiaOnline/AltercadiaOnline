import type { CombatActionIntentFeedback } from '../../shared/combat/combatIntentFeedback.js';
import { exactOptionalProps } from '../../shared/util/exactOptionalProps.js';
import { runCombatFeedbackPipeline } from './combatFeedbackPipeline.js';

/**
 * @deprecated Use `runCombatFeedbackPipeline` via CombatFeedbackOrchestrator.
 * Mantido para intent-ack legado — delega ao pipeline Gateway.
 */
export async function playCombatJuice(
  feedback: CombatActionIntentFeedback,
  root?: ParentNode,
): Promise<void> {
  await runCombatFeedbackPipeline(exactOptionalProps({ feedback, root }));
}
