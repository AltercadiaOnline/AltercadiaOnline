import type http from 'node:http';
import { SecurityGuard } from '../middleware/securityGuard.js';
import type { ServerEnv } from '../config/env.js';
import type { AuthoritativePlayerSnapshotResponse } from '../../shared/auth/playerSnapshotProtocol.js';
import { getServerInstanceContext } from '../instance/ServerInstanceContext.js';
import {
  buildAuthoritativeSnapshotForCharacter,
  hydrateCharacterSession,
} from '../persistence/PersistenceGateway.js';
import { ensureServerPlayerBootstrap } from '../supabase/bootstrapPlayerOnServer.js';
import { loadCharacterData } from '../supabase/loadCharacterData.js';
import { getSupabaseAdminClient } from '../supabase/supabaseAdmin.js';
import {
  persistAuthoritativeLoginSnapshot,
  resolveLoginSnapshotScope,
} from '../supabase/persistAuthoritativeLoginSnapshot.js';

function readDevBypassPlayerId(url: URL): string | null {
  return url.searchParams.get('playerId')?.trim() || null;
}

export async function handlePlayerSnapshotRoute(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  url: URL,
  env: ServerEnv,
): Promise<boolean> {
  if (req.method !== 'GET' || url.pathname !== '/api/player-snapshot') {
    return false;
  }

  const characterId = Number(url.searchParams.get('characterId') ?? '1');
  if (!Number.isFinite(characterId) || characterId < 1) {
    res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ready: false, error: 'characterId inválido.', retryable: false }));
    return true;
  }

function readClientServerId(url: URL): string | null {
  return url.searchParams.get('serverId')?.trim().toLowerCase() || null;
}

  const guard = await SecurityGuard.enforceHttp(env, req, res, {
    characterId,
    devBypassPlayerId: env.devAuthBypass ? readDevBypassPlayerId(url) : null,
    clientServerId: readClientServerId(url),
  });
  if (!guard || !('characterId' in guard)) {
    return true;
  }

  const playerId = guard.userId;
  const serverId = getServerInstanceContext().id;

  try {
    const client = await getSupabaseAdminClient(env);
    const loaded = await loadCharacterData(client, playerId, serverId, guard.characterId);

    if (!loaded.ok) {
      const status = loaded.code === 'WRONG_SERVER' ? 403 : 404;
      res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({
        ready: false,
        error: loaded.message,
        retryable: false,
        code: loaded.code,
      }));
      return true;
    }

    const bootstrap = await ensureServerPlayerBootstrap(playerId, loaded.scope.characterId);

    if (!bootstrap.profileReady) {
      res.writeHead(503, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({
        ready: false,
        error: 'Perfil ainda não provisionado. Tente novamente em instantes.',
        retryable: true,
      }));
      return true;
    }

    await hydrateCharacterSession(playerId, loaded.scope.characterId);
    const snapshot = buildAuthoritativeSnapshotForCharacter(playerId, loaded.scope.characterId);

    await persistAuthoritativeLoginSnapshot(
      env,
      resolveLoginSnapshotScope(playerId, serverId, loaded.scope.characterId),
    );

    const body: AuthoritativePlayerSnapshotResponse = {
      ready: true,
      snapshot,
      ...(bootstrap.created || loaded.created ? { provisioned: true } : {}),
    };

    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(body));
  } catch (error) {
    console.error('[HTTP] player-snapshot falhou', {
      message: error instanceof Error ? error.message : 'unknown',
    });
    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ready: false, error: 'Erro ao carregar perfil.', retryable: false }));
  }

  return true;
}
