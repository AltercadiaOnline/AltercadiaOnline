import { getItemById } from '../shared/items/itemCatalog.js';
import type { InventoryStack } from '../shared/character/equipmentState.js';
import {
  SOULBOUND_DISCARD_MESSAGE,
  validateSoulboundRetention,
} from '../shared/economy/soulboundInventoryPolicy.js';

export { SOULBOUND_DISCARD_MESSAGE };

export type InventoryServiceResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: string };

function validateRemoval(itemId: string): InventoryServiceResult {
  const soulbound = validateSoulboundRetention(itemId);
  if (!soulbound.ok) return soulbound;

  const item = getItemById(itemId);
  if (!item) {
    return { ok: false, reason: 'Item desconhecido.' };
  }
  return { ok: true };
}

/** Bloqueia descarte/destruição de itens soulbound (ex.: diario_memorias). */
export function validateDeleteItem(itemId: string): InventoryServiceResult {
  return validateRemoval(itemId);
}

/** Bloqueia drop no chão — mesma regra do delete para itens indestrutíveis. */
export function validateDropItem(itemId: string): InventoryServiceResult {
  return validateRemoval(itemId);
}

/** Bloqueia venda ao NPC ou Marketplace. */
export function validateSellItem(itemId: string): InventoryServiceResult {
  return validateSoulboundRetention(itemId);
}

/** Bloqueia transferência para cofre ou outro jogador. */
export function validateTransferItem(itemId: string): InventoryServiceResult {
  return validateSoulboundRetention(itemId);
}

export function deleteItem(itemId: string): InventoryServiceResult {
  return validateDeleteItem(itemId);
}

export function dropItem(itemId: string): InventoryServiceResult {
  return validateDropItem(itemId);
}

/** Impede duplicata de itens únicos no inventário. */
export function validateAddItem(
  itemId: string,
  inventory: readonly InventoryStack[],
  quantity: number,
): InventoryServiceResult {
  if (quantity <= 0) return { ok: true };

  const item = getItemById(itemId);
  if (!item) {
    return { ok: false, reason: 'Item desconhecido.' };
  }

  if (item.isUnique) {
    const owned = inventory.some((row) => row.itemId === itemId && row.quantity > 0);
    if (owned) {
      return { ok: false, reason: 'Você já possui este item único.' };
    }
  }

  return { ok: true };
}

export function assertDeleteItemAllowed(itemId: string): void {
  const result = validateDeleteItem(itemId);
  if (!result.ok) {
    throw new Error(result.reason);
  }
}

export function assertDropItemAllowed(itemId: string): void {
  const result = validateDropItem(itemId);
  if (!result.ok) {
    throw new Error(result.reason);
  }
}

export function assertSellItemAllowed(itemId: string): void {
  const result = validateSellItem(itemId);
  if (!result.ok) {
    throw new Error(result.reason);
  }
}

export function assertTransferItemAllowed(itemId: string): void {
  const result = validateTransferItem(itemId);
  if (!result.ok) {
    throw new Error(result.reason);
  }
}

export function assertAddItemAllowed(
  itemId: string,
  inventory: readonly InventoryStack[],
  quantity: number,
): void {
  const result = validateAddItem(itemId, inventory, quantity);
  if (!result.ok) {
    throw new Error(result.reason);
  }
}
