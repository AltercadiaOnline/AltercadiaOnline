/**
 * FLUXO DE DADOS — GiftService
 *
 * UI → GiftService.sendGift(itemId, targetPlayerId)
 *   → GameStore.sendGift (pendingAction + snapshot, sem mutação otimista)
 *   → giftTransferClient → POST /api/gift/transfer (JWT)
 *   → servidor → Supabase RPC transfer_item (transação atômica A→B)
 *   → sucesso: aplica senderStacks no domain store + GameStore
 *   → falha: GameTransactionCoordinator alerta + rollback (inventário intacto)
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
