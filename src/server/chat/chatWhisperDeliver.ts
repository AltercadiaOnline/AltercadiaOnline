import type { ChatWhisperPayload } from '../../shared/social/chatWhisperTypes.js';

type ChatWhisperDeliverer = (
  connectionIds: readonly string[],
  payload: ChatWhisperPayload,
) => void;

let deliverer: ChatWhisperDeliverer | null = null;

/** CombatWsHub registra o fanout WS no boot — só os dois sockets. */
export function bindChatWhisperDeliverer(fn: ChatWhisperDeliverer): void {
  deliverer = fn;
}

export function unbindChatWhisperDeliverer(): void {
  deliverer = null;
}

export function deliverChatWhisperPayload(
  connectionIds: readonly string[],
  payload: ChatWhisperPayload,
): boolean {
  if (!deliverer) {
    console.warn('[chat] Whisper deliverer não vinculado — mensagem descartada.');
    return false;
  }
  deliverer(connectionIds, payload);
  return true;
}
