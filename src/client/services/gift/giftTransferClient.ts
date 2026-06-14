/**
 * Cliente HTTP — presentes via servidor → Supabase RPC transfer_item.
 */

import type { GiftTransferRequest, GiftTransferResponse } from '../../../shared/gift/giftTransferProtocol.js';
import { parseInventoryStacks } from '../../../shared/supabase/gameDatabaseTypes.js';
import { resolveSessionAccessToken } from '../../auth/supabaseAuth.js';
import { AppScreens } from '../../browser/appScreens.js';

export async function requestGiftTransfer(
  payload: GiftTransferRequest,
): Promise<GiftTransferResponse> {
  const token = await resolveSessionAccessToken();
  const session = AppScreens.currentSession;

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const url = new URL('/api/gift/transfer', window.location.origin);
  if (!token && session?.id) {
    url.searchParams.set('playerId', session.id);
  }

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
  } catch {
    return { ok: false, error: 'Servidor indisponível.' };
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await response.json()) as Record<string, unknown>;
  } catch {
    return { ok: false, error: 'Resposta inválida do servidor.' };
  }

  if (!response.ok || body.ok !== true) {
    return {
      ok: false,
      error: typeof body.error === 'string' ? body.error : 'Não foi possível enviar o presente.',
    };
  }

  return {
    ok: true,
    senderStacks: parseInventoryStacks(body.senderStacks),
    itemId: typeof body.itemId === 'string' ? body.itemId : payload.itemId,
    quantity: typeof body.quantity === 'number' ? body.quantity : (payload.quantity ?? 1),
    targetPlayerId: typeof body.targetPlayerId === 'string'
      ? body.targetPlayerId
      : payload.targetPlayerId,
  };
}
