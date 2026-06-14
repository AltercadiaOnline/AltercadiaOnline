import type http from 'node:http';
import { getSessionAuthGateway } from '../auth/SessionAuthGateway.js';
import type { ServerEnv } from '../config/env.js';
import type { AuthoritativePlayerSnapshotResponse } from '../../shared/auth/playerSnapshotProtocol.js';
import { ensureServerPlayerBootstrap } from '../supabase/bootstrapPlayerOnServer.js';
import {
  buildAuthoritativeSnapshotForCharacter,
  hydrateCharacterSession,
} from '../persistence/PersistenceGateway.js';

function readBearerToken(req: http.IncomingMessage): string | null {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  return token.length > 0 ? token : null;
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

  const token = readBearerToken(req);
  let playerId: string | null = null;

  if (token) {
    const verified = await getSessionAuthGateway().verifyAccessToken(token);
    playerId = verified?.userId ?? null;
  }

  if (!playerId && env.devAuthBypass) {
    const fallback = url.searchParams.get('playerId')?.trim();
    if (fallback) playerId = fallback;
  }

  if (!playerId) {
    res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ready: false, error: 'Autenticação necessária.', retryable: false }));
    return true;
  }

  try {
    const bootstrap = await ensureServerPlayerBootstrap(playerId, characterId);

    if (bootstrap.supabaseConfigured && !bootstrap.profileReady) {
      res.writeHead(503, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({
        ready: false,
        error: 'Perfil ainda não provisionado. Tente novamente em instantes.',
        retryable: true,
      }));
      return true;
    }

    await hydrateCharacterSession(playerId, characterId);
    const snapshot = buildAuthoritativeSnapshotForCharacter(playerId, characterId);

    const body: AuthoritativePlayerSnapshotResponse = {
      ready: true,
      snapshot,
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
