import type { WebSocket } from 'ws';
import type { ActionRequest } from '../../../shared/events.js';
import type { CombatDispatchPayload } from '../../../shared/combatWire.js';
import { buildCombatUiHints, withTurnTimerConfig } from '../../../shared/combatWire.js';
import { BATTLE_TURN_TIMER_SEC } from '../../../shared/combat/battleScreenConstants.js';
import { estimateCombatPlaybackMs } from '../../../shared/combat/combatPlaybackBudget.js';
import {
  matchesCombatChoiceWindow,
  resolveCombatChoiceWindowKey,
  type CombatChoiceWindowKey,
} from '../../../shared/combat/playerTurnChoice.js';
import type { CombatSession } from '../../combat/CombatSession.js';

type ChoiceWindowState = CombatChoiceWindowKey & {
  readonly deadlineMs: number;
  readonly playbackGraceMs: number;
};

export type CombatTurnControllerDeps = {
  readonly getSocket: (connectionId: string) => WebSocket | undefined;
  readonly onTurnTimeout: (
    connectionId: string,
    session: CombatSession,
    ws: WebSocket,
    payload: CombatDispatchPayload,
  ) => Promise<void>;
};

/** Timers de turno PvE — janela de escolha, playback grace e timeout automático. */
export class CombatTurnController {
  private readonly turnTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly choiceWindows = new Map<string, ChoiceWindowState>();

  constructor(private readonly deps: CombatTurnControllerDeps) {}

  clearAll(): void {
    for (const timer of this.turnTimers.values()) {
      clearTimeout(timer);
    }
    this.turnTimers.clear();
    this.choiceWindows.clear();
  }

  clearTurnTimer(connectionId: string): void {
    const timer = this.turnTimers.get(connectionId);
    if (timer !== undefined) {
      clearTimeout(timer);
      this.turnTimers.delete(connectionId);
    }
  }

  clearChoiceWindow(connectionId: string): void {
    this.choiceWindows.delete(connectionId);
  }

  enrichPayloadWithTurnTimer(
    connectionId: string,
    session: CombatSession,
    payload: CombatDispatchPayload,
  ): CombatDispatchPayload {
    const playerActorId = session.getPlayerActorId();
    const hints = buildCombatUiHints(payload.state, playerActorId);
    if (!hints.actionsEnabled) {
      this.clearTurnTimer(connectionId);
      this.choiceWindows.delete(connectionId);
      return { ...payload, ui: hints };
    }

    const windowKey = resolveCombatChoiceWindowKey(payload.state, playerActorId);
    if (!windowKey) {
      this.clearTurnTimer(connectionId);
      this.choiceWindows.delete(connectionId);
      return { ...payload, ui: hints };
    }

    const existingWindow = this.choiceWindows.get(connectionId);
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
          turnChoiceBudgetMs: BATTLE_TURN_TIMER_SEC * 1000,
        }),
      };
    }

    const playbackGraceMs = estimateCombatPlaybackMs(payload.events, playerActorId);
    const choiceBudgetMs = BATTLE_TURN_TIMER_SEC * 1000;
    const turnDeadlineMs = Date.now() + playbackGraceMs + choiceBudgetMs;

    this.choiceWindows.set(connectionId, {
      ...windowKey,
      deadlineMs: turnDeadlineMs,
      playbackGraceMs,
    });
    this.scheduleTurnTimer(connectionId, session, playbackGraceMs + choiceBudgetMs);

    return {
      ...payload,
      ui: withTurnTimerConfig(hints, {
        turnDeadlineMs,
        turnPlaybackGraceMs: playbackGraceMs,
        turnChoiceBudgetMs: choiceBudgetMs,
      }),
    };
  }

  validateTurnChoiceWindow(
    connectionId: string,
    session: CombatSession,
    action: ActionRequest,
  ): { readonly ok: true } | { readonly ok: false; readonly reason: string } {
    const window = this.choiceWindows.get(connectionId);
    if (!window) {
      return { ok: false, reason: 'TURN_CHOICE_NOT_OPEN' };
    }
    if (Date.now() > window.deadlineMs) {
      return { ok: false, reason: 'TURN_CHOICE_EXPIRED' };
    }
    if (action.actorId !== session.getPlayerActorId()) {
      return { ok: false, reason: 'NOT_YOUR_ACTOR' };
    }
    if (!matchesCombatChoiceWindow(action.turn, window)) {
      return { ok: false, reason: 'STALE_TURN' };
    }
    const liveKey = resolveCombatChoiceWindowKey(session.getState(), session.getPlayerActorId());
    if (!liveKey || liveKey.turn !== window.turn || liveKey.allianceSlot !== window.allianceSlot) {
      return { ok: false, reason: 'TURN_CHOICE_NOT_OPEN' };
    }
    return { ok: true };
  }

  rescheduleActiveTurnTimer(connectionId: string, session: CombatSession): void {
    const window = this.choiceWindows.get(connectionId);
    if (window && Date.now() < window.deadlineMs) {
      this.scheduleTurnTimer(connectionId, session, window.deadlineMs - Date.now());
    }
  }

  private scheduleTurnTimer(
    connectionId: string,
    session: CombatSession,
    durationMs: number,
  ): void {
    this.clearTurnTimer(connectionId);
    const ws = this.deps.getSocket(connectionId);
    if (!ws) return;

    const timer = setTimeout(() => {
      void this.onTurnTimerExpired(connectionId, session, ws);
    }, durationMs);
    this.turnTimers.set(connectionId, timer);
  }

  private async onTurnTimerExpired(
    connectionId: string,
    session: CombatSession,
    ws: WebSocket,
  ): Promise<void> {
    this.turnTimers.delete(connectionId);
    this.choiceWindows.delete(connectionId);
    const state = session.getState();
    const playerActorId = session.getPlayerActorId();
    const windowKey = resolveCombatChoiceWindowKey(state, playerActorId);
    if (!windowKey) {
      return;
    }

    const result = await session.dispatchPlayerAction({
      battleId: state.battleId,
      actorId: session.getPlayerActorId(),
      turn: state.turn,
      skillId: null,
      requestId: `timeout-${Date.now()}`,
    });
    if (!result.ok) return;
    await this.deps.onTurnTimeout(connectionId, session, ws, result.payload);
  }
}
