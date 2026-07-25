// @ts-nocheck
let broadcaster = null;
let displayNameResolver = null;
/** CombatWsHub registra o fanout WS no boot. */
export function bindChatGlobalBroadcaster(fn) {
    broadcaster = fn;
}
/** Resolve displayName da sessão de mundo (playerId + characterId). */
export function bindChatGlobalDisplayNameResolver(fn) {
    displayNameResolver = fn;
}
export function unbindChatGlobalBroadcast() {
    broadcaster = null;
    displayNameResolver = null;
}
export function resolveChatGlobalDisplayName(playerId, characterId) {
    const name = displayNameResolver?.(playerId, characterId)?.trim();
    return name && name.length > 0 ? name : 'Jogador';
}
/** Intent handler e rota legada `chat-global-send` usam o mesmo fanout. */
export function broadcastChatGlobalPayload(payload) {
    if (!broadcaster) {
        console.warn('[chat] Broadcaster não vinculado — mensagem descartada.');
        return false;
    }
    broadcaster(payload);
    return true;
}
