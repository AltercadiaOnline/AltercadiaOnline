/**
 * Contrato wire de intenções cliente → servidor (protocolo de garantia).
 */
export type ClientIntent<T = unknown> = {
  readonly intentId: string;
  /** Eco obrigatório na resposta — mesmo valor que intentId no wire atual. */
  readonly correlationId: string;
  readonly type: string;
  readonly payload: T;
  readonly timestamp: number;
};

/** Idade máxima aceita — evita replay de intents antigas. */
export const INTENT_MAX_AGE_MS = 30_000;

/** Tolerância de relógio adiantado no cliente. */
export const INTENT_MAX_CLOCK_SKEW_MS = 5_000;

export type IntentTimestampValidation =
  | { readonly ok: true }
  | { readonly ok: false; readonly code: 'STALE_INTENT' | 'FUTURE_INTENT' | 'INVALID_TIMESTAMP' };

export function createIntentId(): string {
  const cryptoRef = globalThis.crypto;
  if (cryptoRef && typeof cryptoRef.randomUUID === 'function') {
    return cryptoRef.randomUUID();
  }
  return `intent-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export function createClientIntent<T>(type: string, payload: T, intentId?: string): ClientIntent<T> {
  const id = intentId ?? createIntentId();
  return {
    intentId: id,
    correlationId: id,
    type,
    payload,
    timestamp: Date.now(),
  };
}

export function isClientIntentRecord(value: unknown): value is ClientIntent {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  const intentId = record.intentId;
  const correlationId = record.correlationId ?? intentId;
  return typeof intentId === 'string'
    && intentId.length > 0
    && typeof correlationId === 'string'
    && correlationId.length > 0
    && typeof record.type === 'string'
    && record.type.length > 0
    && record.payload !== undefined
    && typeof record.timestamp === 'number'
    && Number.isFinite(record.timestamp);
}

export function validateIntentTimestamp(
  timestamp: number,
  nowMs: number = Date.now(),
): IntentTimestampValidation {
  if (!Number.isFinite(timestamp)) {
    return { ok: false, code: 'INVALID_TIMESTAMP' };
  }
  if (timestamp > nowMs + INTENT_MAX_CLOCK_SKEW_MS) {
    return { ok: false, code: 'FUTURE_INTENT' };
  }
  if (timestamp < nowMs - INTENT_MAX_AGE_MS) {
    return { ok: false, code: 'STALE_INTENT' };
  }
  return { ok: true };
}

export function pendingIntentToWire(intent: {
  readonly intentId: string;
  readonly action: { readonly type: string; readonly payload: unknown };
  readonly timestamp: number;
}): ClientIntent {
  return {
    intentId: intent.intentId,
    correlationId: intent.intentId,
    type: intent.action.type,
    payload: intent.action.payload,
    timestamp: intent.timestamp,
  };
}
