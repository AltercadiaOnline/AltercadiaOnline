import type { CombatEvent } from './events.js';
import type { CombatState } from './types.js';

/** Instruções de UI derivadas do servidor — cliente não infere regras de turno. */
export type CombatUiHints = {
  readonly actionsEnabled: boolean;
  readonly activeActorId: string | null;
  readonly playerActorId: string;
};

export function buildCombatUiHints(state: CombatState, playerActorId: string): CombatUiHints {
  const { phase, activeActorId } = state;
  return {
    actionsEnabled: phase === 'CHOOSING' && activeActorId === playerActorId,
    activeActorId,
    playerActorId,
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
};

function isCombatUiHints(value: unknown): value is CombatUiHints {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  if (typeof record.actionsEnabled !== 'boolean') return false;
  if (record.activeActorId !== null && typeof record.activeActorId !== 'string') return false;
  return typeof record.playerActorId === 'string';
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
