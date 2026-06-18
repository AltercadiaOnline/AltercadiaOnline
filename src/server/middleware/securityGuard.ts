import type http from 'node:http';
import type { ServerEnv } from '../config/env.js';
import { getSessionAuthGateway } from '../auth/SessionAuthGateway.js';
import { assertPlayerBoundToServerInstance } from '../instance/playerInstanceBinding.js';
import { getServerInstanceContext } from '../instance/ServerInstanceContext.js';
import { requireServerId } from '../../shared/supabase/characterServerScope.js';

/** Contexto autoritativo após validação — única fonte de identidade para handlers. */
export type AuthoritativePlayerContext = {
  readonly userId: string;
  readonly characterId: number;
  readonly serverId: string;
  readonly email?: string;
};

export type SecurityViolationCode =
  | 'AUTH_REQUIRED'
  | 'AUTH_INVALID'
  | 'AUTH_MISMATCH'
  | 'WRONG_SERVER'
  | 'CHARACTER_NOT_ON_SHARD'
  | 'INVALID_CHARACTER';

export class SecurityViolation extends Error {
  readonly code: SecurityViolationCode;
  readonly httpStatus: 401 | 403;
  readonly shouldDisconnect: boolean;

  constructor(
    code: SecurityViolationCode,
    message: string,
    options?: { readonly httpStatus?: 401 | 403; readonly shouldDisconnect?: boolean },
  ) {
    super(message);
    this.name = 'SecurityViolation';
    this.code = code;
    this.httpStatus = options?.httpStatus ?? (code === 'AUTH_REQUIRED' || code === 'AUTH_INVALID' ? 401 : 403);
    this.shouldDisconnect = options?.shouldDisconnect ?? shouldDisconnectForCode(code);
  }
}

function shouldDisconnectForCode(code: SecurityViolationCode): boolean {
  // Apenas spoofing de identidade (JWT ≠ user_id reivindicado) derruba o socket.
  return code === 'AUTH_MISMATCH';
}

export type ValidatePlayerActionInput = {
  readonly accessToken?: string | null;
  readonly claimedUserId: string;
  readonly characterId: number;
  readonly clientServerId?: string;
  readonly devBypassPlayerId?: string | null;
};

export type HttpGuardOptions = {
  readonly characterId?: number;
  readonly devBypassPlayerId?: string | null;
  readonly clientServerId?: string | null;
};

export type WsGuardDeps = {
  readonly ws: { close(code?: number, reason?: string): void };
  readonly sendSystemError: (code: SecurityViolationCode, message: string) => void;
  readonly onViolatorDisconnect?: () => void;
  readonly logContext?: Record<string, unknown>;
};

const WS_CLOSE_POLICY_VIOLATION = 4003;

/**
 * Guarda server-authoritative — valida JWT Supabase + vínculo user/character/server_id
 * antes de qualquer ação sensível (HTTP ou WebSocket).
 */
export class SecurityGuard {
  private constructor() {}

  /**
   * Valida token, identidade e shard. Lança SecurityViolation se falhar.
   */
  static async validatePlayerAction(
    env: ServerEnv,
    input: ValidatePlayerActionInput,
  ): Promise<AuthoritativePlayerContext> {
    const serverId = requireServerId(getServerInstanceContext().id);
    const claimedUserId = input.claimedUserId?.trim();
    if (!claimedUserId) {
      throw new SecurityViolation('AUTH_REQUIRED', 'Identidade do jogador ausente.');
    }

    if (input.characterId < 1 || !Number.isFinite(input.characterId)) {
      throw new SecurityViolation('INVALID_CHARACTER', 'characterId inválido.');
    }

    if (input.clientServerId !== undefined) {
      const reported = requireServerId(input.clientServerId);
      if (reported !== serverId) {
        throw new SecurityViolation(
          'WRONG_SERVER',
          `Shard reportado "${reported}" não corresponde a "${serverId}".`,
        );
      }
    }

    const authGateway = getSessionAuthGateway();
    let verifiedUserId = claimedUserId;
    let email: string | undefined;

    if (authGateway.isAuthRequired()) {
      const token = input.accessToken?.trim() ?? '';
      if (!token) {
        throw new SecurityViolation('AUTH_REQUIRED', 'Token de autenticação obrigatório.');
      }

      const verified = await authGateway.verifyAccessToken(token);
      if (!verified) {
        throw new SecurityViolation('AUTH_INVALID', 'Token inválido ou expirado.');
      }

      if (verified.userId !== claimedUserId) {
        throw new SecurityViolation(
          'AUTH_MISMATCH',
          'user_id do payload não corresponde ao JWT.',
        );
      }

      verifiedUserId = verified.userId;
      email = verified.email;
    } else if (input.devBypassPlayerId?.trim()) {
      const devId = input.devBypassPlayerId.trim();
      if (devId !== claimedUserId) {
        throw new SecurityViolation('AUTH_MISMATCH', 'playerId de desenvolvimento não confere.');
      }
      verifiedUserId = devId;
    }

    const binding = await assertPlayerBoundToServerInstance(
      env,
      verifiedUserId,
      input.characterId,
      serverId,
    );

    if (!binding.ok) {
      throw new SecurityViolation(
        binding.code === 'WRONG_SERVER' ? 'CHARACTER_NOT_ON_SHARD' : 'WRONG_SERVER',
        binding.message,
      );
    }

    return {
      userId: verifiedUserId,
      characterId: input.characterId,
      serverId,
      ...(email ? { email } : {}),
    };
  }

  /** Valida apenas JWT + user_id (rotas sem characterId, ex.: listar hub). */
  static async validateAuthenticatedUser(
    _env: ServerEnv,
    input: {
      readonly accessToken?: string | null;
      readonly claimedUserId?: string;
      readonly devBypassPlayerId?: string | null;
      readonly clientServerId?: string | null;
    },
  ): Promise<{ readonly userId: string; readonly serverId: string; readonly email?: string }> {
    const serverId = requireServerId(getServerInstanceContext().id);

    if (input.clientServerId !== undefined && input.clientServerId !== null) {
      const reported = requireServerId(input.clientServerId);
      if (reported !== serverId) {
        throw new SecurityViolation(
          'WRONG_SERVER',
          `Shard reportado "${reported}" não corresponde a "${serverId}".`,
        );
      }
    }

    const authGateway = getSessionAuthGateway();

    if (authGateway.isAuthRequired()) {
      const token = input.accessToken?.trim() ?? '';
      if (!token) {
        throw new SecurityViolation('AUTH_REQUIRED', 'Token de autenticação obrigatório.');
      }

      const verified = await authGateway.verifyAccessToken(token);
      if (!verified) {
        throw new SecurityViolation('AUTH_INVALID', 'Token inválido ou expirado.');
      }

      if (input.claimedUserId && input.claimedUserId !== verified.userId) {
        throw new SecurityViolation(
          'AUTH_MISMATCH',
          'user_id não corresponde ao JWT.',
          { shouldDisconnect: true },
        );
      }

      return {
        userId: verified.userId,
        serverId,
        ...(verified.email ? { email: verified.email } : {}),
      };
    }

    const devId = input.devBypassPlayerId?.trim() ?? input.claimedUserId?.trim();
    if (!devId) {
      throw new SecurityViolation('AUTH_REQUIRED', 'Autenticação necessária.');
    }

    return { userId: devId, serverId };
  }

  /**
   * Middleware HTTP — responde 401/403 e retorna null se bloqueado.
   */
  static async enforceHttp(
    env: ServerEnv,
    req: http.IncomingMessage,
    res: http.ServerResponse,
    options: HttpGuardOptions = {},
  ): Promise<AuthoritativePlayerContext | { readonly userId: string; readonly serverId: string } | null> {
    try {
      const token = readBearerToken(req);
      const devBypassPlayerId = options.devBypassPlayerId?.trim() || null;

      if (options.characterId !== undefined) {
        let claimedUserId = devBypassPlayerId ?? '';

        if (getSessionAuthGateway().isAuthRequired()) {
          if (!token) {
            throw new SecurityViolation('AUTH_REQUIRED', 'Autenticação necessária.');
          }
          const verified = await getSessionAuthGateway().verifyAccessToken(token);
          if (!verified) {
            throw new SecurityViolation('AUTH_INVALID', 'Token inválido ou expirado.');
          }
          claimedUserId = verified.userId;
        } else if (!claimedUserId) {
          throw new SecurityViolation('AUTH_REQUIRED', 'Autenticação necessária.');
        }

        return await SecurityGuard.validatePlayerAction(env, {
          accessToken: token,
          claimedUserId,
          characterId: options.characterId,
          devBypassPlayerId,
          ...(options.clientServerId ? { clientServerId: options.clientServerId } : {}),
        });
      }

      return await SecurityGuard.validateAuthenticatedUser(env, {
        accessToken: token,
        devBypassPlayerId,
        ...(options.clientServerId ? { clientServerId: options.clientServerId } : {}),
      });
    } catch (error) {
      if (error instanceof SecurityViolation) {
        SecurityGuard.respondHttpViolation(res, error);
        return null;
      }
      throw error;
    }
  }

  /**
   * Middleware WebSocket — envia erro de sistema e desconecta clientes suspeitos.
   *
   * @example
   * const ctx = await SecurityGuard.enforceWs(env, {
   *   ws,
   *   sendSystemError: (code, msg) => hub.send(ws, { type: 'combat-error', payload: { reason: code } }),
   *   onViolatorDisconnect: () => hub.clearConnection(connectionId),
   * }, {
   *   accessToken: world.accessToken,
   *   claimedUserId: world.playerId,
   *   characterId: world.characterId,
   * });
   * if (!ctx) return;
   * // executar attack / heal / trade...
   */
  static async enforceWs(
    env: ServerEnv,
    deps: WsGuardDeps,
    input: ValidatePlayerActionInput,
  ): Promise<AuthoritativePlayerContext | null> {
    try {
      return await SecurityGuard.validatePlayerAction(env, {
        ...input,
        clientServerId: input.clientServerId ?? getServerInstanceContext().id,
      });
    } catch (error) {
      if (error instanceof SecurityViolation) {
        SecurityGuard.respondWsViolation(deps, error);
        return null;
      }
      throw error;
    }
  }

  static respondHttpViolation(res: http.ServerResponse, violation: SecurityViolation): void {
    res.writeHead(violation.httpStatus, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({
      ok: false,
      error: violation.message,
      code: violation.code,
    }));
  }

  static respondWsViolation(deps: WsGuardDeps, violation: SecurityViolation): void {
    console.warn('[SecurityGuard] Violação bloqueada', {
      code: violation.code,
      message: violation.message,
      disconnect: violation.shouldDisconnect,
      ...(deps.logContext ?? {}),
    });

    deps.sendSystemError(violation.code, violation.message);

    if (violation.shouldDisconnect) {
      deps.onViolatorDisconnect?.();
      try {
        deps.ws.close(WS_CLOSE_POLICY_VIOLATION, violation.code);
      } catch {
        // socket já fechado
      }
    }
  }
}

function readBearerToken(req: http.IncomingMessage): string | null {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  return token.length > 0 ? token : null;
}
