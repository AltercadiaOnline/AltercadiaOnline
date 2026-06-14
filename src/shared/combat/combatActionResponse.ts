import type { CombatActionIntentResultData } from './combatIntentFeedback.js';
import type { CombatVisualFeedback } from './combatVisualFeedback.js';
import { buildEmptyCombatVisualFeedback } from './combatVisualFeedback.js';

/** Resposta de redirecionamento — combate real via WebSocket `combat-action`. */
export type CombatActionRedirectResponse = {
  readonly channel: 'USE_COMBAT_CHANNEL';
  readonly feedback: CombatVisualFeedback;
};

/** @deprecated Alias legado */
export type CombatActionResponse = CombatActionRedirectResponse;

export function buildCombatActionRedirectResponse(): CombatActionRedirectResponse {
  return {
    channel: 'USE_COMBAT_CHANNEL',
    feedback: buildEmptyCombatVisualFeedback(),
  };
}

/** IntentResult.data quando a ação de combate é confirmada no canal intent. */
export type CombatActionIntentResponse = CombatActionIntentResultData;
