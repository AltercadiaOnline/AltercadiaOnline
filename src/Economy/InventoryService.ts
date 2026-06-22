import { getItemMechanicalById } from '../shared/items/itemCatalog.js';
import type { InventoryStack } from '../shared/character/equipmentState.js';
import {
  SOULBOUND_DISCARD_MESSAGE,
  validateSoulboundRetention,
} from '../shared/economy/soulboundInventoryPolicy.js';
import { validateInventoryDeleteIntent } from '../shared/economy/inventoryPolicy.js';

export { SOULBOUND_DISCARD_MESSAGE };

export type InventoryServiceResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: string };

function validateRemoval(itemId: string): InventoryServiceResult {
  const soulbound = validateSoulboundRetention(itemId);
  if (!soulbound.ok) return soulbound;

  const policy = validateInventoryDeleteIntent({ itemId, quantity: 1 });
  if (!policy.ok) {
    return { ok: false, reason: policy.reason };
  }

  return { ok: true };
}

/** Bloqueia descarte/destruição de itens soulbound (ex.: diario_memorias). */
export function validateDeleteItem(itemId: string): InventoryServiceResult {
  return validateRemoval(itemId);
}

/** Bloqueia descarte destrutivo — mesma regra do delete (sem drop no mapa). */
export function validateDropItem(itemId: string): InventoryServiceResult {
  return validateRemoval(itemId);
}

/** Bloqueia venda ao NPC ou Marketplace. */
export function validateSellItem(itemId: string): InventoryServiceResult {
  return validateSoulboundRetention(itemId);
}

const NON_TRADABLE_TRANSFER_MESSAGE = 'Este item não pode ser transferido.';

/** Bloqueia transferência para cofre ou outro jogador. */
export function validateTransferItem(itemId: string): InventoryServiceResult {
  const soulbound = validateSoulboundRetention(itemId);
  if (!soulbound.ok) return soulbound;

  const item = getItemMechanicalById(itemId);
  if (item?.isTradable === false) {
    return { ok: false, reason: NON_TRADABLE_TRANSFER_MESSAGE };
  }

  return { ok: true };
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

  const item = getItemMechanicalById(itemId);
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
