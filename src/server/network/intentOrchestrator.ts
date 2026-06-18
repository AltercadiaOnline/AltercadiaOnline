import {
  buildIntentFailureFromMessage,
  type IntentResponse,
  toIntentResult,
} from '../../shared/intent/intentProtocol.js';

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
