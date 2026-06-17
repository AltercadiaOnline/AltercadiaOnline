import type http from 'node:http';
import { getSessionAuthGateway } from '../auth/SessionAuthGateway.js';
import type { ServerEnv } from '../config/env.js';
import type { ClassType } from '../../shared/types/classes.js';
import type { CreateCharacterRequest } from '../../shared/auth/characterHubProtocol.js';
import {
  buildAuthoritativeCharacterHub,
  createAuthoritativeCharacterInSlot,
} from './characterHubService.js';

function readBearerToken(req: http.IncomingMessage): string | null {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  return token.length > 0 ? token : null;
}

async function readJsonBody(req: http.IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  if (chunks.length === 0) return {};
  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (!raw) return {};
  return JSON.parse(raw) as unknown;
}

async function resolvePlayerId(
  req: http.IncomingMessage,
  url: URL,
  env: ServerEnv,
): Promise<string | null> {
  const token = readBearerToken(req);
  if (token) {
    const verified = await getSessionAuthGateway().verifyAccessToken(token);
    return verified?.userId ?? null;
  }

  if (env.devAuthBypass) {
    const fallback = url.searchParams.get('playerId')?.trim();
    if (fallback) return fallback;
  }

  return null;
}

function isCreateCharacterRequest(value: unknown): value is CreateCharacterRequest {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.slotIndex === 'number'
    && typeof record.name === 'string'
    && typeof record.class === 'string'
  );
}

export async function handleCharacterHubRoute(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  url: URL,
  env: ServerEnv,
): Promise<boolean> {
  if (url.pathname !== '/api/character-hub') {
    return false;
  }

  const playerId = await resolvePlayerId(req, url, env);
  if (!playerId) {
    res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: false, message: 'Autenticação necessária.' }));
    return true;
  }

  try {
    if (req.method === 'GET') {
      const hub = await buildAuthoritativeCharacterHub(playerId, env);
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: true, hub }));
      return true;
    }

    if (req.method === 'POST') {
      const body = await readJsonBody(req);
      if (!isCreateCharacterRequest(body)) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: false, message: 'Payload inválido para criação de personagem.' }));
        return true;
      }

      const result = await createAuthoritativeCharacterInSlot(playerId, env, {
        slotIndex: body.slotIndex,
        name: body.name,
        class: body.class as ClassType,
      });

      if (!result.ok) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: false, message: result.message }));
        return true;
      }

      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: true, hub: result.hub }));
      return true;
    }

    res.writeHead(405, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: false, message: 'Método não permitido.' }));
    return true;
  } catch (error) {
    console.error('[HTTP] character-hub falhou', {
      message: error instanceof Error ? error.message : 'unknown',
    });
    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: false, message: 'Erro ao carregar hub de personagens.' }));
    return true;
  }
}
