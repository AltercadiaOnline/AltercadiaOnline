import { exactOptionalProps } from '../util/exactOptionalProps.js';
import type { ClientIntent } from './clientIntent.js';

export type { ClientIntent } from './clientIntent.js';
export {
  createClientIntent,
  createIntentId,
  isClientIntentRecord,
  pendingIntentToWire,
  validateIntentTimestamp,
} from './clientIntent.js';

/** Contexto de sessão — preenchido pelo hub WS; não trafega no wire. */
export type GatewayIntentContext = {
  readonly playerId: string;
  readonly characterId: number;
};

/**
 * Intenção autoritativa no servidor — espelho de `ClientIntent` + contexto de sessão.
 * Usada por handlers vendor (`BaseTransactionHandler`) e pelo orquestrador.
 */
export type GatewayIntentAction<TPayload = unknown> = GatewayIntentContext & ClientIntent<TPayload>;

/**
 * Entrada parcial para dispatch interno / testes.
 * `timestamp` é opcional — o gateway preenche com `Date.now()` quando ausente.
 */
export type GatewayIntentDispatchInput<TPayload = unknown> = GatewayIntentContext & {
  readonly intentId: string;
  readonly payload: TPayload;
  readonly timestamp?: number;
};

/** Monta ação completa a partir de wire + sessão. */
export function gatewayIntentFromClient<TPayload>(
  ctx: GatewayIntentContext,
  intent: ClientIntent<TPayload>,
): GatewayIntentAction<TPayload> {
  return {
    playerId: ctx.playerId,
    characterId: ctx.characterId,
    intentId: intent.intentId,
    type: intent.type,
    payload: intent.payload,
    timestamp: intent.timestamp,
  };
}

/** Monta ação completa para handlers legados e rotas internas. */
export function buildGatewayIntentAction<TPayload>(
  type: string,
  input: GatewayIntentDispatchInput<TPayload>,
): GatewayIntentAction<TPayload> {
  return {
    playerId: input.playerId,
    characterId: input.characterId,
    intentId: input.intentId,
    type,
    payload: input.payload,
    timestamp: input.timestamp ?? Date.now(),
  };
}

/** Monta ação a partir da assinatura `execute(playerId, characterId, payload, intentId)`. */
export function buildGatewayIntentActionFromExecute<TPayload>(
  type: string,
  playerId: string,
  characterId: number,
  payload: TPayload,
  intentId: string,
  timestamp?: number,
): GatewayIntentAction<TPayload> {
  return buildGatewayIntentAction(type, {
    playerId,
    characterId,
    intentId,
    payload,
    ...(timestamp !== undefined ? { timestamp } : {}),
  });
}

/** Status obrigatório de todo handler de player-intent. */
export type IntentStatus = 'SUCCESS' | 'FAILURE';

/**
 * Resposta interna do handler — sempre ecoa o intentId original.
 */
export type IntentResponse = {
  readonly intentId: string;
  readonly status: IntentStatus;
  /** Código máquina (ex.: SALDO_INSUFICIENTE). */
  readonly error?: string;
  /** Mensagem humana opcional para logs. */
  readonly message?: string;
};

/** Payload wire unificado — protocolo de garantia (ack ao cliente). */
export type IntentResult = {
  readonly intentId: string;
  readonly success: boolean;
  readonly error?: string;
  readonly data?: unknown;
};

/** @deprecated Use IntentResult via intent-result */
export type IntentFailedPayload = {
  readonly intentId: string;
  readonly message: string;
};

/** @deprecated Use IntentResult via intent-result */
export type IntentSuccessPayload = {
  readonly intentId: string;
};

/** @deprecated Use IntentResponse */
export type IntentHandlerResult = IntentResponse;

const INTENT_ERROR_MESSAGES: Readonly<Record<string, string>> = {
  SALDO_INSUFICIENTE: 'Saldo insuficiente.',
  HANDLER_NOT_FOUND: 'Ação não disponível no servidor.',
  UNKNOWN_ACTION: 'Tipo de intenção desconhecido.',
  INTENT_REJECTED: 'Intenção rejeitada pelo servidor.',
  REPLAY_DETECTED: 'Intenção já processada.',
  STALE_INTENT: 'Intenção expirada — tente novamente.',
  ERR_ACTION_FORBIDDEN: 'Ação indisponível durante combate.',
};

export function resolveIntentErrorCode(source: {
  readonly code?: string | undefined;
  readonly message?: string | undefined;
}): string {
  if (source.code === 'INSUFFICIENT_FUNDS') return 'SALDO_INSUFICIENTE';
  const message = source.message ?? '';
  if (message.includes('INSUFFICIENT_FUNDS') || message.includes('VOLTS insuficientes')) {
    return 'SALDO_INSUFICIENTE';
  }
  if (message.includes('Handler não registrado')) return 'HANDLER_NOT_FOUND';
  if (message.startsWith('UNKNOWN_ACTION_TYPE')) return 'UNKNOWN_ACTION';
  if (message === 'ERR_ACTION_FORBIDDEN' || message.includes('ERR_ACTION_FORBIDDEN')) {
    return 'ERR_ACTION_FORBIDDEN';
  }
  if (source.code && source.code.length > 0) return source.code;
  return 'INTENT_REJECTED';
}

export function getIntentErrorMessage(error: string): string {
  return INTENT_ERROR_MESSAGES[error] ?? error;
}

export function buildIntentSuccess(intentId: string): IntentResponse {
  return { intentId, status: 'SUCCESS' };
}

export function buildIntentFailure(
  intentId: string,
  error: string,
  message?: string,
): IntentResponse {
  return {
    intentId,
    status: 'FAILURE',
    error,
    ...(message !== undefined ? { message } : {}),
  };
}

export function buildIntentFailureFromMessage(intentId: string, message: string): IntentResponse {
  return buildIntentFailure(intentId, resolveIntentErrorCode({ message }), message);
}

export function toIntentResult(response: IntentResponse): IntentResult {
  if (response.status === 'SUCCESS') {
    return { intentId: response.intentId, success: true };
  }
  return {
    intentId: response.intentId,
    success: false,
    error: response.error ?? resolveIntentErrorCode(exactOptionalProps({ message: response.message })),
  };
}

export function isIntentResult(value: unknown): value is IntentResult {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return typeof record.intentId === 'string'
    && record.intentId.length > 0
    && typeof record.success === 'boolean'
    && (record.success === true || typeof record.error === 'string');
}

export function buildIntentResultWire(
  intentId: string,
  success: boolean,
  data?: unknown,
): IntentResult {
  if (success) {
    return {
      intentId,
      success: true,
      ...(data !== undefined ? { data } : {}),
    };
  }
  return {
    intentId,
    success: false,
    error: typeof data === 'string' ? data : 'INTENT_REJECTED',
  };
}

export function isIntentFailedPayload(value: unknown): value is IntentFailedPayload {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return typeof record.intentId === 'string'
    && record.intentId.length > 0
    && typeof record.message === 'string';
}

export function isIntentSuccessPayload(value: unknown): value is IntentSuccessPayload {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return typeof record.intentId === 'string' && record.intentId.length > 0;
}
