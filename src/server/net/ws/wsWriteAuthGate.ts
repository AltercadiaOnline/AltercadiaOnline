import type { ServerEnv } from '../../config/env.js';
import {
  SecurityGuard,
  type AuthoritativePlayerContext,
  type SecurityViolationCode,
} from '../../middleware/securityGuard.js';
import { getServerInstanceContext } from '../../instance/ServerInstanceContext.js';
import type { LiveSocket, WorldConnectionState } from './wsConnectionTypes.js';

/** Mensagens com validação JWT dedicada (intent + serverId do payload). */
export const WS_WRITE_AUTH_SKIP_TYPES = new Set<string>([
  'world-login',
  'player-intent',
]);

export type WorldWriteAuthDeps = {
  readonly ws: LiveSocket;
  readonly sendCombatError: (code: SecurityViolationCode, message: string) => void;
  readonly invalidateSession: () => void;
  readonly logContext?: Record<string, unknown>;
};

/**
 * Revalida JWT Supabase + vínculo shard antes de mutações WS (fail-closed).
 * Usa o token armazenado no world-login — atualize via novo world-login após TOKEN_REFRESHED.
 */
export async function revalidateWorldWriteAccess(
  env: ServerEnv,
  deps: WorldWriteAuthDeps,
  world: WorldConnectionState,
): Promise<AuthoritativePlayerContext | null> {
  return SecurityGuard.enforceWs(
    env,
    {
      ws: deps.ws,
      sendSystemError: (code, message) => deps.sendCombatError(code, message),
      onViolatorDisconnect: deps.invalidateSession,
      ...(deps.logContext ? { logContext: deps.logContext } : {}),
    },
    {
      accessToken: world.accessToken,
      claimedUserId: world.playerId,
      characterId: world.characterId,
      clientServerId: getServerInstanceContext().id,
    },
  );
}

export function shouldRevalidateWorldWriteJwt(messageType: string): boolean {
  return !WS_WRITE_AUTH_SKIP_TYPES.has(messageType);
}
