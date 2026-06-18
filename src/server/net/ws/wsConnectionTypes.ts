import type { WebSocket } from 'ws';

export type LiveSocket = WebSocket & { readonly sessionId?: string };

export type WorldConnectionState = {
  readonly playerId: string;
  readonly characterId: number;
  readonly displayName: string;
  readonly authUserId: string;
  /** JWT Supabase — revalidado antes de cada player-intent (memória, nunca logado). */
  readonly accessToken: string | null;
};

/** Mensagens WS que exigem world-login quando auth está ativo. */
export const WORLD_AUTH_REQUIRED_MESSAGES = new Set<string>([
  'request-full-state',
  'player-intent',
  'position-sync',
  'portal-transition-request',
  'chat-global-send',
  'refraction-booth-quote',
  'refraction-booth-start',
  'refraction-booth-complete',
  'world-chronicles-request',
  'combat-join',
  'combat-action',
  'combat-forfeit',
  'combat-collect-loot',
  'combat-confirm-loot',
  'combat-dismiss-loot',
  'player-honor-given',
]);

/** Subconjunto de {@link WORLD_AUTH_REQUIRED_MESSAGES} — JWT revalidado a cada mensagem (C.2). */
export const WS_JWT_REVALIDATED_WRITE_MESSAGES = WORLD_AUTH_REQUIRED_MESSAGES;
