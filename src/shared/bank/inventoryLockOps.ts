import type { InventoryStack } from '../character/equipmentState.js';

export function resolveAvailableStackQuantity(stack: InventoryStack): number {
  const locked = Math.max(0, Math.floor(stack.lockedQuantity ?? 0));
  return Math.max(0, stack.quantity - locked);
}

export function findInventoryStackIndex(
  stacks: readonly InventoryStack[],
  itemId: string,
): number {
  return stacks.findIndex((stack) => stack.itemId === itemId);
}

/** Reserva quantidade no inventário (LOCKED) antes da validação do cofre. */
export function lockInventoryQuantity(
  stacks: readonly InventoryStack[],
  itemId: string,
  quantity: number,
): { readonly ok: true; readonly stacks: InventoryStack[] } | { readonly ok: false; readonly reason: string } {
  const qty = Math.floor(quantity);
  if (!Number.isFinite(qty) || qty <= 0) {
    return { ok: false, reason: 'Quantidade inválida.' };
  }

  const index = findInventoryStackIndex(stacks, itemId);
  if (index < 0) {
    return { ok: false, reason: 'Item não pertence ao inventário.' };
  }

  const stack = stacks[index]!;
  const available = resolveAvailableStackQuantity(stack);
  if (available < qty) {
    return { ok: false, reason: 'Quantidade indisponível (itens bloqueados ou insuficientes).' };
  }

  const lockedQuantity = (stack.lockedQuantity ?? 0) + qty;
  const next = stacks.map((entry, i) => (
    i === index ? { ...entry, lockedQuantity } : { ...entry }
  ));

  return { ok: true, stacks: next };
}

export function unlockInventoryQuantity(
  stacks: readonly InventoryStack[],
  itemId: string,
  quantity: number,
): InventoryStack[] {
  const qty = Math.floor(quantity);
  if (qty <= 0) return stacks.map((stack) => ({ ...stack }));

  const index = findInventoryStackIndex(stacks, itemId);
  if (index < 0) return stacks.map((stack) => ({ ...stack }));

  const stack = stacks[index]!;
  const nextLocked = Math.max(0, (stack.lockedQuantity ?? 0) - qty);
  return stacks.map((entry, i) => {
    if (i !== index) return { ...entry };
    if (nextLocked <= 0) {
      const { lockedQuantity: _drop, ...rest } = entry;
      return rest;
    }
    return { ...entry, lockedQuantity: nextLocked };
  });
}

/** Remove quantidade ignorando lock (após commit atômico). */
export function consumeInventoryQuantity(
  stacks: readonly InventoryStack[],
  itemId: string,
  quantity: number,
): { readonly ok: true; readonly stacks: InventoryStack[] } | { readonly ok: false; readonly reason: string } {
  const qty = Math.floor(quantity);
  const index = findInventoryStackIndex(stacks, itemId);
  if (index < 0) {
    return { ok: false, reason: 'Item não encontrado no inventário.' };
  }

  const stack = stacks[index]!;
  if (stack.quantity < qty) {
    return { ok: false, reason: 'Quantidade insuficiente no inventário.' };
  }

  const nextQty = stack.quantity - qty;
  const nextLocked = Math.max(0, (stack.lockedQuantity ?? 0) - qty);

  const next = stacks
    .map((entry, i) => {
      if (i !== index) return { ...entry };
      if (nextQty <= 0) return null;
      if (nextLocked <= 0) {
        const { lockedQuantity: _drop, ...rest } = entry;
        return { ...rest, quantity: nextQty };
      }
      return { ...entry, quantity: nextQty, lockedQuantity: nextLocked };
    })
    .filter((entry): entry is InventoryStack => entry !== null);

  return { ok: true, stacks: next };
}
