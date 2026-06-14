import { createIntentId } from '../intent/clientIntent.js';

/** Identificador de correlação cliente ↔ servidor para uma ação pendente. */
export type CorrelationId = string;

export type PendingActionKind = 'player-intent' | 'economy-event' | 'combat-command';

export type PendingActionAck = {
  readonly correlationId: CorrelationId;
  readonly success: boolean;
  readonly error?: string;
};

/** Gera ID único para correlacionar comando e resposta. */
export function createCorrelationId(): CorrelationId {
  return createIntentId();
}

/** Resolve o ID de correlação em payloads wire (compat intentId legado). */
export function resolveCorrelationId(payload: {
  readonly correlationId?: string;
  readonly intentId?: string;
}): CorrelationId | null {
  const id = payload.correlationId ?? payload.intentId;
  if (typeof id !== 'string' || id.length === 0) return null;
  return id;
}

/** Anexa correlationId espelhando intentId — resposta autoritativa do servidor. */
export function withCorrelationId<T extends { readonly intentId: string }>(
  payload: T,
): T & { readonly correlationId: CorrelationId } {
  return { ...payload, correlationId: payload.intentId };
}
