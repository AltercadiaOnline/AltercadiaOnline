import { getItemMechanicalById } from '../items/itemCatalog.js';
import { DIARIO_MEMORIAS_ITEM_ID } from '../items/soulboundItems.js';

export const SOULBOUND_DISCARD_MESSAGE =
  'Este item é parte da sua alma e não pode ser descartado.';

export type SoulboundValidationResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: string };

/** Item único ligado ao jogador — não pode sair da posse (venda, banco, drop, delete). */
export function isSoulboundItem(itemId: string): boolean {
  if (itemId === DIARIO_MEMORIAS_ITEM_ID) return true;
  const item = getItemMechanicalById(itemId);
  return item?.isIndestructible === true && item?.isUnique === true;
}

export function validateSoulboundRetention(itemId: string): SoulboundValidationResult {
  if (isSoulboundItem(itemId)) {
    return { ok: false, reason: SOULBOUND_DISCARD_MESSAGE };
  }
  return { ok: true };
}
