import type { ClientIntent } from '../../shared/intent/clientIntent.js';
import type { GatewayIntentAction } from '../../shared/intent/intentProtocol.js';
import {
  gatewayIntentFromClient,
} from '../../shared/intent/intentProtocol.js';
export type {
  GatewayIntentAction,
  GatewayIntentContext,
  GatewayIntentDispatchInput,
} from '../../shared/intent/intentProtocol.js';
export {
  buildGatewayIntentAction,
  buildGatewayIntentActionFromExecute,
  gatewayIntentFromClient,
} from '../../shared/intent/intentProtocol.js';

/** @deprecated Use GatewayIntentAction — alias mantido para handlers vendor existentes. */
export type TransactionIntentAction<TPayload = unknown> = GatewayIntentAction<TPayload>;

export function toTransactionIntentAction<TPayload>(
  playerId: string,
  characterId: number,
  intent: ClientIntent<TPayload>,
): TransactionIntentAction<TPayload> {
  return gatewayIntentFromClient({ playerId, characterId }, intent);
}

/** Alias — mesma forma das intenções emitidas pelo ActionDispatcher no cliente. */
export type ServerClientAction<TPayload = unknown> = TransactionIntentAction<TPayload>;

export class TransactionValidationError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'TransactionValidationError';
    this.code = code;
  }
}

export type TransactionValidationResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly code: string; readonly message: string };

export type TransactionExecuteResult =
  | { readonly ok: true; readonly events: readonly import('../../shared/economy/events.js').EconomyEvent[] }
  | { readonly ok: false; readonly code: string; readonly message: string };

/** Resultado de execute — alias pedido pela camada de handlers. */
export type TransactionResult = TransactionExecuteResult;

export type { IntentHandlerResult, IntentResponse, IntentStatus } from '../../shared/intent/intentProtocol.js';
export { buildIntentFailure, buildIntentSuccess } from '../../shared/intent/intentProtocol.js';

/** Payloads com intentId obrigatório — emissão pós-transação vendor. */
export type IntentAcknowledgedPayload = {
  readonly intentId: string;
  readonly playerId: string;
};

export function isTransactionValidationFailure(
  result: TransactionValidationResult,
): result is Extract<TransactionValidationResult, { ok: false }> {
  return !result.ok;
}

export function isTransactionExecuteFailure(
  result: TransactionExecuteResult,
): result is Extract<TransactionExecuteResult, { ok: false }> {
  return !result.ok;
}
