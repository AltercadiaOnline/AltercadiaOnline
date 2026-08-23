/** WebSocket.OPEN / CONNECTING — sessão ainda considerada viva. */
const WS_OPEN = 1;
const WS_CONNECTING = 0;

export function isWebSocketLive(ws: { readonly readyState: number } | null | undefined): boolean {
  if (!ws) return false;
  return ws.readyState === WS_OPEN || ws.readyState === WS_CONNECTING;
}

export type CharacterSessionGateResult =
  | { readonly allow: true; readonly staleConnectionId?: string }
  | { readonly allow: false; readonly reason: 'ALREADY_ONLINE' };

/**
 * Um personagem = uma sessão de mundo ativa por processo.
 * Re-login na mesma conexão OK; segunda conexão viva → recusa; fantasma → limpa e aceita.
 */
export function resolveCharacterSessionGate(input: {
  readonly existingConnectionId: string | null;
  readonly incomingConnectionId: string;
  readonly isExistingLive: boolean;
}): CharacterSessionGateResult {
  if (!input.existingConnectionId) {
    return { allow: true };
  }
  if (input.existingConnectionId === input.incomingConnectionId) {
    return { allow: true };
  }
  if (input.isExistingLive) {
    return { allow: false, reason: 'ALREADY_ONLINE' };
  }
  return { allow: true, staleConnectionId: input.existingConnectionId };
}
