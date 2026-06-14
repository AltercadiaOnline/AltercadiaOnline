import { BATTLE_TURN_TIMER_SEC } from './combat/battleScreenConstants.js';
import { canPlayerIssueCombatChoice } from './combat/playerTurnChoice.js';
import type { CombatActionIntentResultData } from './combat/combatIntentFeedback.js';
import type { CombatVisualFeedback } from './combat/combatVisualFeedback.js';
import type { CombatEvent } from './events.js';
import type { CombatState } from './types.js';

/** Orçamento fixo de escolha por turno (ex.: 10s) — independente do grace de animação. */
export const BATTLE_TURN_CHOICE_BUDGET_MS = BATTLE_TURN_TIMER_SEC * 1000;

/** Instruções de UI derivadas do servidor — cliente não infere regras de turno. */
export type CombatUiHints = {
  readonly actionsEnabled: boolean;
  readonly activeActorId: string | null;
  readonly playerActorId: string;
  /** Epoch ms — fim da janela (grace de playback + orçamento de escolha). */
  readonly turnDeadlineMs?: number;
  /** Grace de animação reservado antes do countdown de escolha (ms). */
  readonly turnPlaybackGraceMs?: number;
  /** Orçamento de escolha exibido no HUD (ms) — tipicamente 10s. */
  readonly turnChoiceBudgetMs?: number;
};

export function buildCombatUiHints(state: CombatState, playerActorId: string): CombatUiHints {
  return {
    actionsEnabled: canPlayerIssueCombatChoice(state, playerActorId),
    activeActorId: state.activeActorId,
    playerActorId,
  };
}

export function withTurnDeadline(hints: CombatUiHints, turnDeadlineMs: number): CombatUiHints {
  return { ...hints, turnDeadlineMs };
}

export type TurnTimerUiConfig = {
  readonly turnDeadlineMs: number;
  readonly turnPlaybackGraceMs?: number;
  readonly turnChoiceBudgetMs?: number;
};

/** Anexa deadline + metadados imutáveis da janela de escolha ao HUD. */
export function withTurnTimerConfig(
  hints: CombatUiHints,
  config: TurnTimerUiConfig,
): CombatUiHints {
  return {
    ...hints,
    turnDeadlineMs: config.turnDeadlineMs,
    turnPlaybackGraceMs: config.turnPlaybackGraceMs ?? 0,
    turnChoiceBudgetMs: config.turnChoiceBudgetMs ?? BATTLE_TURN_CHOICE_BUDGET_MS,
  };
}

/**
 * Payload do canal WebSocket `combat-event` (espelha DispatchResult do CombatGateway + UI).
 */
export type CombatDispatchPayload = {
  readonly events: readonly CombatEvent[];
  readonly state: CombatState;
  readonly ui: CombatUiHints;
  readonly balanceVersion?: string;
  /** Roteiro visual 2D — flash, shake, dano, etc. */
  readonly feedback?: CombatVisualFeedback;
  /** Juice compacto (IntentResult.data.feedback) espelhado no combat-event. */
  readonly actionResult?: CombatActionIntentResultData;
};

function isCombatUiHints(value: unknown): value is CombatUiHints {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  if (typeof record.actionsEnabled !== 'boolean') return false;
  if (record.activeActorId !== null && typeof record.activeActorId !== 'string') return false;
  if (typeof record.playerActorId !== 'string') return false;
  if (
    record.turnDeadlineMs !== undefined
    && (typeof record.turnDeadlineMs !== 'number' || !Number.isFinite(record.turnDeadlineMs))
  ) {
    return false;
  }
  if (
    record.turnPlaybackGraceMs !== undefined
    && (typeof record.turnPlaybackGraceMs !== 'number' || !Number.isFinite(record.turnPlaybackGraceMs))
  ) {
    return false;
  }
  if (
    record.turnChoiceBudgetMs !== undefined
    && (typeof record.turnChoiceBudgetMs !== 'number' || !Number.isFinite(record.turnChoiceBudgetMs))
  ) {
    return false;
  }
  return true;
}

export function isCombatDispatchPayload(value: unknown): value is CombatDispatchPayload {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return (
    Array.isArray(record.events) &&
    record.state != null &&
    typeof record.state === 'object' &&
    isCombatUiHints(record.ui)
  );
}
