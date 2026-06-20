/**
 * Cliente HTTP — presentes via servidor Railway → Supabase RPC transfer_item.
 */

import type { GiftTransferRequest, GiftTransferResponse } from '../../../shared/gift/giftTransferProtocol.js';
import { parseInventoryStacks } from '../../../shared/supabase/gameDatabaseTypes.js';
import { resolveActiveServerId } from '../../auth/resolveLoginServerId.js';
import { gameServerFetch } from '../../net/gameServerClient.js';

export async function requestGiftTransfer(
  payload: GiftTransferRequest,
): Promise<GiftTransferResponse> {
  let response: Response;
  try {
    response = await gameServerFetch('/api/gift/transfer', {
      method: 'POST',
      searchParams: { serverId: resolveActiveServerId() },
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        serverId: resolveActiveServerId(),
      }),
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
