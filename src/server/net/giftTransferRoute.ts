import type http from 'node:http';
import { getSessionAuthGateway } from '../auth/SessionAuthGateway.js';
import type { ServerEnv } from '../config/env.js';
import type { GiftTransferRequest } from '../../shared/gift/giftTransferProtocol.js';
import { executeTransferItem } from '../supabase/transferItem.js';

function readBearerToken(req: http.IncomingMessage): string | null {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  return token.length > 0 ? token : null;
}

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
  };
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

  const token = readBearerToken(req);
  let senderUserId: string | null = null;

  if (token) {
    const verified = await getSessionAuthGateway().verifyAccessToken(token);
    senderUserId = verified?.userId ?? null;
  }

  if (!senderUserId && env.devAuthBypass) {
    senderUserId = url.searchParams.get('playerId')?.trim() ?? null;
  }

  if (!senderUserId) {
    res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: false, error: 'Autenticação necessária.' }));
    return true;
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

  const result = await executeTransferItem(senderUserId, payload);

  if (!result.ok) {
    res.writeHead(409, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: false, error: result.message }));
    return true;
  }

  res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({
    ok: true,
    itemId: result.data.itemId,
    quantity: result.data.quantity,
    targetPlayerId: result.data.targetPlayerId,
    senderStacks: result.data.senderStacks,
  }));
  return true;
}
