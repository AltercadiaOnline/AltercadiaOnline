import type { ChatGlobalPayload } from '../../shared/world/globalChatTypes.js';

type ChatGlobalBroadcaster = (payload: ChatGlobalPayload) => void;
type ChatGlobalDisplayNameResolver = (
  playerId: string,
  characterId: number,
) => string | null;

let broadcaster: ChatGlobalBroadcaster | null = null;
let displayNameResolver: ChatGlobalDisplayNameResolver | null = null;

/** CombatWsHub registra o fanout WS no boot. */
export function bindChatGlobalBroadcaster(fn: ChatGlobalBroadcaster): void {
  broadcaster = fn;
}

/** Resolve displayName da sessão de mundo (playerId + characterId). */
export function bindChatGlobalDisplayNameResolver(fn: ChatGlobalDisplayNameResolver): void {
  displayNameResolver = fn;
}

export function unbindChatGlobalBroadcast(): void {
  broadcaster = null;
  displayNameResolver = null;
}

export function resolveChatGlobalDisplayName(
  playerId: string,
  characterId: number,
): string {
  const name = displayNameResolver?.(playerId, characterId)?.trim();
  return name && name.length > 0 ? name : 'Jogador';
}

/** Intent handler e rota legada `chat-global-send` usam o mesmo fanout. */
export function broadcastChatGlobalPayload(payload: ChatGlobalPayload): boolean {
  if (!broadcaster) {
    console.warn('[chat] Broadcaster não vinculado — mensagem descartada.');
    return false;
  }
  broadcaster(payload);
  return true;
}
