import {
  buildIntentFailureFromMessage,
  type IntentResponse,
  toIntentResult,
} from '../../shared/intent/intentProtocol.js';
import type { ILegacyIntentHandler } from './IIntentHandler.js';
import {
  resolveIntentHandler,
  type RegisteredIntentHandler,
} from '../network/intentHandlerRegistry.js';
import type { GatewayIntentAction } from '../../shared/intent/intentProtocol.js';

function isLegacyIntentHandler(
  handler: RegisteredIntentHandler,
): handler is ILegacyIntentHandler<unknown> {
  return handler.execute.length >= 4;
}

export type IntentWsSender = (message: {
  readonly type: 'intent-result';
  readonly payload: import('../../shared/intent/intentProtocol.js').IntentResult;
}) => void;

/** Envia ack WS unificado — garante que o cliente nunca fique pending sem resposta. */
export function sendIntentHandlerResult(sender: IntentWsSender, result: IntentResponse): void {
  sender({
    type: 'intent-result',
    payload: toIntentResult(result),
  });
}

export function sendIntentFailure(
  sender: IntentWsSender,
  intentId: string,
  message: string,
  error?: string,
): void {
  sendIntentHandlerResult(
    sender,
    error
      ? { intentId, status: 'FAILURE', error, message }
      : buildIntentFailureFromMessage(intentId, message),
  );
}

/**
 * Executa handler registrado com try/catch — falhas de negócio viram FAILURE + intentId.
 */
export async function runRegisteredIntentHandler(
  type: string,
  action: GatewayIntentAction,
): Promise<IntentResponse> {
  let handler: RegisteredIntentHandler | null;
  try {
    handler = resolveIntentHandler(type);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao resolver handler.';
    return buildIntentFailureFromMessage(action.intentId, message);
  }

  if (!handler) {
    return buildIntentFailureFromMessage(
      action.intentId,
      `Handler não registrado: ${type}`,
    );
  }

  if (!isLegacyIntentHandler(handler)) {
    return buildIntentFailureFromMessage(
      action.intentId,
      `Handler ${type} requer sessão WS dedicada.`,
    );
  }

  try {
    return await handler.execute(
      action.playerId,
      action.characterId,
      action.payload,
      action.intentId,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao processar intenção.';
    return buildIntentFailureFromMessage(action.intentId, message);
  }
}
