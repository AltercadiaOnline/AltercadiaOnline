import { getItemById, getItemMechanicalById } from '../items/itemCatalog.js';
import { ItemCategory } from '../items/itemSchema.js';
import { resolveAvailableStackQuantity } from '../bank/inventoryLockOps.js';
import type { InventoryStack } from '../character/equipmentState.js';
import { isSoulboundItem, SOULBOUND_DISCARD_MESSAGE } from './soulboundInventoryPolicy.js';

export const INDESTRUCTIBLE_DISCARD_MESSAGE =
  'Este item não pode ser destruído.';

export const INVENTORY_LOCKED_DISCARD_MESSAGE =
  'Item bloqueado — transação bancária em andamento.';

export type InventoryDeletePolicyInput = {
  readonly itemId: string;
  readonly quantity: number;
  readonly inventoryStacks?: readonly InventoryStack[];
  readonly slotQuantity?: number;
  readonly lockedQuantity?: number;
};

export type InventoryDeletePolicyResult =
  | { readonly ok: true; readonly canShowDeleteButton: true }
  | { readonly ok: false; readonly reason: string; readonly canShowDeleteButton: boolean };

function resolveAvailableQuantity(input: InventoryDeletePolicyInput): number {
  if (input.inventoryStacks) {
    return input.inventoryStacks
      .filter((row) => row.itemId === input.itemId)
      .reduce((total, row) => total + resolveAvailableStackQuantity(row), 0);
  }

  const slotQty = Math.max(0, Math.floor(input.slotQuantity ?? 0));
  const locked = Math.max(0, Math.floor(input.lockedQuantity ?? 0));
  return Math.max(0, slotQty - locked);
}

/** Política canônica — descarte/destruição de item do inventário. */
export function evaluateInventoryDeletePolicy(
  input: InventoryDeletePolicyInput,
): InventoryDeletePolicyResult {
  const { itemId } = input;
  const quantity = Math.max(1, Math.floor(input.quantity));

  if (!getItemById(itemId)) {
    return { ok: false, reason: 'Item desconhecido.', canShowDeleteButton: false };
  }

  if (isSoulboundItem(itemId)) {
    return { ok: false, reason: SOULBOUND_DISCARD_MESSAGE, canShowDeleteButton: false };
  }

  const mechanical = getItemMechanicalById(itemId);
  if (mechanical?.isIndestructible) {
    return { ok: false, reason: INDESTRUCTIBLE_DISCARD_MESSAGE, canShowDeleteButton: false };
  }

  if (mechanical?.category === ItemCategory.Currency) {
    return { ok: false, reason: 'Moedas não podem ser descartadas.', canShowDeleteButton: false };
  }

  const available = resolveAvailableQuantity(input);
  if (available <= 0) {
    const locked = Math.max(0, Math.floor(input.lockedQuantity ?? 0));
    const reason = locked > 0
      ? INVENTORY_LOCKED_DISCARD_MESSAGE
      : 'Item indisponível no inventário.';
    return { ok: false, reason, canShowDeleteButton: false };
  }

  if (quantity > available) {
    return {
      ok: false,
      reason: 'Quantidade indisponível (itens bloqueados ou insuficientes).',
      canShowDeleteButton: true,
    };
  }

  return { ok: true, canShowDeleteButton: true };
}

export function canShowInventoryDeleteButton(input: {
  readonly itemId: string;
  readonly slotQuantity: number;
  readonly lockedQuantity?: number;
}): boolean {
  return evaluateInventoryDeletePolicy({
    itemId: input.itemId,
    quantity: 1,
    slotQuantity: input.slotQuantity,
    ...(input.lockedQuantity !== undefined ? { lockedQuantity: input.lockedQuantity } : {}),
  }).canShowDeleteButton;
}

export function validateInventoryDeleteIntent(
  input: InventoryDeletePolicyInput,
): { readonly ok: true } | { readonly ok: false; readonly reason: string } {
  const decision = evaluateInventoryDeletePolicy(input);
  if (!decision.ok) {
    return { ok: false, reason: decision.reason };
  }
  return { ok: true };
}
