import type { InventoryStack } from '../character/equipmentState.js';
import { parseInventoryStacks } from '../supabase/gameDatabaseTypes.js';

export type GiftTransferRequest = {
  readonly itemId: string;
  readonly targetPlayerId: string;
  readonly quantity?: number;
  readonly characterId?: number;
  readonly targetCharacterId?: number;
  /** Shard reportado pelo cliente — validado no SecurityGuard. */
  readonly serverId?: string;
};

export type GiftTransferSuccess = {
  readonly ok: true;
  readonly senderStacks: InventoryStack[];
  readonly itemId: string;
  readonly quantity: number;
  readonly targetPlayerId: string;
};

export type GiftTransferFailure = {
  readonly ok: false;
  readonly error: string;
};

export type GiftTransferResponse = GiftTransferSuccess | GiftTransferFailure;

export function mapGiftTransferRpcResult(raw: unknown): GiftTransferSuccess | GiftTransferFailure {
  if (!raw || typeof raw !== 'object') {
    return { ok: false, error: 'Resposta inválida do servidor.' };
  }

  const record = raw as Record<string, unknown>;
  const senderStacks = parseInventoryStacks(record.senderStacks);
  const itemId = typeof record.itemId === 'string' ? record.itemId : '';
  const quantity = typeof record.quantity === 'number' ? record.quantity : 0;
  const targetPlayerId = typeof record.toUserId === 'string' ? record.toUserId : '';

  if (!itemId || quantity < 1) {
    return { ok: false, error: 'Resposta inválida do servidor.' };
  }

  return {
    ok: true,
    senderStacks,
    itemId,
    quantity,
    targetPlayerId,
  };
}

export function mapGiftTransferErrorMessage(code: string): string {
  switch (code) {
    case 'INSUFFICIENT_QUANTITY':
      return 'Quantidade insuficiente no inventário.';
    case 'SENDER_INVENTORY_NOT_FOUND':
      return 'Inventário do remetente não encontrado.';
    case 'RECIPIENT_INVENTORY_NOT_FOUND':
      return 'Inventário do destinatário não encontrado.';
    case 'RECIPIENT_NOT_ON_SHARD':
      return 'Destinatário não está neste shard.';
    case 'SENDER_NOT_ON_SHARD':
      return 'Personagem remetente não está neste shard.';
    case 'SELF_TRANSFER':
      return 'Não é possível enviar presente para si mesmo.';
    case 'INVALID_ITEM':
    case 'INVALID_QUANTITY':
    case 'INVALID_PLAYERS':
      return 'Dados do presente inválidos.';
    default:
      return 'Não foi possível enviar o presente.';
  }
}
