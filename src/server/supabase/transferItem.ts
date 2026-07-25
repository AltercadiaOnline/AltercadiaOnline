import type { GiftTransferRequest, GiftTransferSuccess } from '../../shared/gift/giftTransferProtocol.js';
import {
  mapGiftTransferErrorMessage,
  mapGiftTransferRpcResult,
} from '../../shared/gift/giftTransferProtocol.js';
import { setCharacterInventoryStacks } from '../../Economy/economyStore.js';
import { requireServerId } from '../../shared/supabase/characterServerScope.js';
import { loadServerEnv } from '../config/env.js';
import { getSupabaseAdminClient } from './supabaseAdmin.js';

export type TransferItemResult =
  | { readonly ok: true; readonly data: GiftTransferSuccess }
  | { readonly ok: false; readonly message: string };

export async function executeTransferItem(
  senderUserId: string,
  serverId: string,
  payload: GiftTransferRequest,
): Promise<TransferItemResult> {
  const env = loadServerEnv();
  const client = await getSupabaseAdminClient(env);
  const scopedServerId = requireServerId(serverId);

  const quantity = Math.max(1, Math.floor(payload.quantity ?? 1));
  if (typeof payload.characterId !== 'number' || !Number.isInteger(payload.characterId) || payload.characterId < 1) {
    return { ok: false, message: 'characterId do remetente é obrigatório.' };
  }
  const fromCharacterId = payload.characterId;
  // Destinatário: se omitido, usa o personagem ativo do destinatário via RPC default legado —
  // preferir targetCharacterId explícito no cliente.
  const toCharacterId =
    typeof payload.targetCharacterId === 'number'
    && Number.isInteger(payload.targetCharacterId)
    && payload.targetCharacterId >= 1
      ? payload.targetCharacterId
      : null;
  if (toCharacterId === null) {
    return { ok: false, message: 'targetCharacterId do destinatário é obrigatório.' };
  }

  const { data, error } = await client.rpc('transfer_item', {
    p_from_user_id: senderUserId,
    p_to_user_id: payload.targetPlayerId,
    p_item_id: payload.itemId.trim(),
    p_quantity: quantity,
    p_from_character_id: fromCharacterId,
    p_to_character_id: toCharacterId,
    p_server_id: scopedServerId,
  });

  if (error) {
    const message = error.message ?? '';
    for (const code of [
      'INSUFFICIENT_QUANTITY',
      'SENDER_INVENTORY_NOT_FOUND',
      'RECIPIENT_INVENTORY_NOT_FOUND',
      'RECIPIENT_NOT_ON_SHARD',
      'SENDER_NOT_ON_SHARD',
      'SELF_TRANSFER',
      'INVALID_ITEM',
      'INVALID_QUANTITY',
      'INVALID_PLAYERS',
    ]) {
      if (message.includes(code)) {
        return { ok: false, message: mapGiftTransferErrorMessage(code) };
      }
    }
    return { ok: false, message: mapGiftTransferErrorMessage('UNKNOWN') };
  }

  const mapped = mapGiftTransferRpcResult(data);
  if (!mapped.ok) {
    return { ok: false, message: mapped.error };
  }

  syncSenderEconomyInventory(senderUserId, fromCharacterId, mapped.senderStacks);

  return { ok: true, data: mapped };
}

function syncSenderEconomyInventory(
  playerId: string,
  characterId: number,
  stacks: readonly { itemId: string; quantity: number; charges?: number }[],
): void {
  setCharacterInventoryStacks(playerId, characterId, stacks);
}
