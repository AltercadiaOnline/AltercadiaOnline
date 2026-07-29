/**
 * Anexa turnDeadlineMs / grace ao payload de combate — compartilhado online (hub) e local.
 * Só monta a UI de janela de escolha. O timeout autoritativo (skillId:null) fica em
 * CombatTurnController (online) ou localCombatAuthority / localPvpRankedAuthority (local).
 */

import type { CombatDispatchPayload } from '../combatWire.js';
import {
  BATTLE_TURN_CHOICE_BUDGET_MS,
  buildCombatUiHints,
  withTurnTimerConfig,
} from '../combatWire.js';
import { estimateCombatPlaybackMs } from './combatPlaybackBudget.js';
import {
  resolveCombatChoiceWindowKey,
  type CombatChoiceWindowKey,
} from './playerTurnChoice.js';

export type CombatTurnWindowState = CombatChoiceWindowKey & {
  readonly deadlineMs: number;
  readonly playbackGraceMs: number;
};

/**
 * Espelha `CombatTurnController.enrichPayloadWithTurnTimer` sem WebSocket / schedule.
 * @param windows mapa mutável por sessão (connectionId online ou battleId local)
 */
export function enrichCombatDispatchTurnTimerUi(
  payload: CombatDispatchPayload,
  playerActorId: string,
  windows: Map<string, CombatTurnWindowState>,
  windowOwnerKey: string,
): CombatDispatchPayload {
  const hints = buildCombatUiHints(payload.state, playerActorId);
  if (!hints.actionsEnabled) {
    windows.delete(windowOwnerKey);
    return { ...payload, ui: hints };
  }

  const windowKey = resolveCombatChoiceWindowKey(payload.state, playerActorId);
  if (!windowKey) {
    windows.delete(windowOwnerKey);
    return { ...payload, ui: hints };
  }

  const existingWindow = windows.get(windowOwnerKey);
  if (
    existingWindow
    && existingWindow.turn === windowKey.turn
    && existingWindow.allianceSlot === windowKey.allianceSlot
    && Date.now() < existingWindow.deadlineMs
  ) {
    return {
      ...payload,
      ui: withTurnTimerConfig(hints, {
        turnDeadlineMs: existingWindow.deadlineMs,
        turnPlaybackGraceMs: existingWindow.playbackGraceMs,
        turnChoiceBudgetMs: BATTLE_TURN_CHOICE_BUDGET_MS,
      }),
    };
  }

  const playbackGraceMs = estimateCombatPlaybackMs(payload.events, playerActorId);
  const choiceBudgetMs = BATTLE_TURN_CHOICE_BUDGET_MS;
  const turnDeadlineMs = Date.now() + playbackGraceMs + choiceBudgetMs;

  windows.set(windowOwnerKey, {
    ...windowKey,
    deadlineMs: turnDeadlineMs,
    playbackGraceMs,
  });

  return {
    ...payload,
    ui: withTurnTimerConfig(hints, {
      turnDeadlineMs,
      turnPlaybackGraceMs: playbackGraceMs,
      turnChoiceBudgetMs: choiceBudgetMs,
    }),
  };
}

export function clearCombatTurnWindow(
  windows: Map<string, CombatTurnWindowState>,
  windowOwnerKey: string,
): void {
  windows.delete(windowOwnerKey);
}
