import type http from 'node:http';
import { SecurityGuard } from '../middleware/securityGuard.js';
import type { ServerEnv } from '../config/env.js';
import type { GiftTransferRequest } from '../../shared/gift/giftTransferProtocol.js';
import {
  finalizeGiftTransferSender,
  validateGiftTransferRequest,
} from '../../Economy/economyGateway.js';
import { executeTransferItem } from '../supabase/transferItem.js';

async function readJsonBody(req: http.IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (!raw) return {};
  return JSON.parse(raw) as unknown;
}

function parseGiftTransferRequest(body: unknown): GiftTransferRequest | null {
  if (!body || typeof body !== 'object') return null;
  const record = body as Record<string, unknown>;
  const itemId = typeof record.itemId === 'string' ? record.itemId.trim() : '';
  const targetPlayerId = typeof record.targetPlayerId === 'string'
    ? record.targetPlayerId.trim()
    : '';
  if (!itemId || !targetPlayerId) return null;

  return {
    itemId,
    targetPlayerId,
    ...(typeof record.quantity === 'number' ? { quantity: record.quantity } : {}),
    ...(typeof record.characterId === 'number' ? { characterId: record.characterId } : {}),
    ...(typeof record.targetCharacterId === 'number'
      ? { targetCharacterId: record.targetCharacterId }
      : {}),
    ...(typeof record.serverId === 'string' && record.serverId.trim().length > 0
      ? { serverId: record.serverId.trim().toLowerCase() }
      : {}),
  };
}

function resolveClientServerId(url: URL, body: unknown): string | null {
  const fromQuery = url.searchParams.get('serverId')?.trim().toLowerCase();
  if (fromQuery) return fromQuery;

  if (!body || typeof body !== 'object') return null;
  const record = body as Record<string, unknown>;
  const fromBody = typeof record.serverId === 'string' ? record.serverId.trim().toLowerCase() : '';
  return fromBody || null;
}

export async function handleGiftTransferRoute(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  url: URL,
  env: ServerEnv,
): Promise<boolean> {
  if (req.method !== 'POST' || url.pathname !== '/api/gift/transfer') {
    return false;
  }

  let body: unknown;
  try {
    body = await readJsonBody(req);
  } catch {
    res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: false, error: 'JSON inválido.' }));
    return true;
  }

  const payload = parseGiftTransferRequest(body);
  if (!payload) {
    res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: false, error: 'itemId e targetPlayerId são obrigatórios.' }));
    return true;
  }

  const auth = await SecurityGuard.enforceHttp(env, req, res, {
    devBypassPlayerId: env.devAuthBypass ? url.searchParams.get('playerId')?.trim() ?? null : null,
    clientServerId: resolveClientServerId(url, body),
    characterId: payload.characterId ?? 1,
  });
  if (!auth) {
    return true;
  }

  if (!('characterId' in auth)) {
    res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: false, error: 'Personagem inválido para transferência.' }));
    return true;
  }

  const policy = validateGiftTransferRequest({
    senderPlayerId: auth.userId,
    senderCharacterId: auth.characterId,
    itemId: payload.itemId,
    ...(payload.quantity !== undefined ? { quantity: payload.quantity } : {}),
  });

  if (!policy.ok) {
    res.writeHead(409, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: false, error: policy.message }));
    return true;
  }

  const result = await executeTransferItem(auth.userId, auth.serverId, {
    ...payload,
    characterId: auth.characterId,
    quantity: policy.quantity,
  });

  if (!result.ok) {
    res.writeHead(409, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: false, error: result.message }));
    return true;
  }

  finalizeGiftTransferSender(auth.userId, auth.characterId, result.data);

  res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({
    ok: true,
    itemId: result.data.itemId,
    quantity: result.data.quantity,
    targetPlayerId: result.data.targetPlayerId,
    senderStacks: result.data.senderStacks,
    serverId: auth.serverId,
  }));
  return true;
}
