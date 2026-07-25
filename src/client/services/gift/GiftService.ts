/**
 * FLUXO DE DADOS — GiftService
 *
 * UI → GiftService.sendGift(itemId, targetPlayerId)
 *   → GameStore.sendGift → ActionDispatcher GIFT_TRANSFER (player-intent)
 *   → servidor GiftTransferHandler → Supabase RPC transfer_item
 *   → InventoryUpdated / intent-result (espelho no cliente)
 */

import { getGameStore } from '../../state/GameStore.js';

export type GiftSendPayload = {
  readonly itemId: string;
  readonly targetPlayerId: string;
  readonly quantity?: number;
  readonly characterId?: number;
  readonly targetCharacterId?: number;
};

export async function sendGift(payload: GiftSendPayload): Promise<{ ok: boolean; message?: string }> {
  return getGameStore().sendGift(
    payload.itemId,
    payload.targetPlayerId,
    payload.quantity ?? 1,
    payload.characterId,
    payload.targetCharacterId,
  );
}
