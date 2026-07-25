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

function totalAvailableQuantity(stacks: readonly InventoryStack[], itemId: string): number {
  return stacks
    .filter((stack) => stack.itemId === itemId)
    .reduce((sum, stack) => sum + resolveAvailableStackQuantity(stack), 0);
}

function totalQuantity(stacks: readonly InventoryStack[], itemId: string): number {
  return stacks
    .filter((stack) => stack.itemId === itemId)
    .reduce((sum, stack) => sum + stack.quantity, 0);
}

function withAdjustedLock(entry: InventoryStack, nextLocked: number): InventoryStack {
  if (nextLocked <= 0) {
    const { lockedQuantity: _drop, ...rest } = entry;
    return rest;
  }
  return { ...entry, lockedQuantity: nextLocked };
}

/** Reserva quantidade no inventário (LOCKED) antes da validação do cofre — cobre várias pilhas. */
export function lockInventoryQuantity(
  stacks: readonly InventoryStack[],
  itemId: string,
  quantity: number,
): { readonly ok: true; readonly stacks: InventoryStack[] } | { readonly ok: false; readonly reason: string } {
  const qty = Math.floor(quantity);
  if (!Number.isFinite(qty) || qty <= 0) {
    return { ok: false, reason: 'Quantidade inválida.' };
  }

  if (totalAvailableQuantity(stacks, itemId) < qty) {
    const hasItem = stacks.some((stack) => stack.itemId === itemId);
    return {
      ok: false,
      reason: hasItem
        ? 'Quantidade indisponível (itens bloqueados ou insuficientes).'
        : 'Item não pertence ao inventário.',
    };
  }

  let remaining = qty;
  const next = stacks.map((entry) => {
    if (entry.itemId !== itemId || remaining <= 0) {
      return { ...entry };
    }
    const available = resolveAvailableStackQuantity(entry);
    if (available <= 0) return { ...entry };
    const take = Math.min(available, remaining);
    remaining -= take;
    return { ...entry, lockedQuantity: (entry.lockedQuantity ?? 0) + take };
  });

  return { ok: true, stacks: next };
}

/** Libera reserva LOCKED — cobre várias pilhas (LIFO reverso: do fim para o início). */
export function unlockInventoryQuantity(
  stacks: readonly InventoryStack[],
  itemId: string,
  quantity: number,
): InventoryStack[] {
  const qty = Math.floor(quantity);
  if (qty <= 0) return stacks.map((stack) => ({ ...stack }));

  let remaining = qty;
  const next = stacks.map((entry) => ({ ...entry }));

  for (let i = next.length - 1; i >= 0 && remaining > 0; i -= 1) {
    const entry = next[i]!;
    if (entry.itemId !== itemId) continue;
    const locked = Math.max(0, Math.floor(entry.lockedQuantity ?? 0));
    if (locked <= 0) continue;
    const release = Math.min(locked, remaining);
    remaining -= release;
    next[i] = withAdjustedLock(entry, locked - release);
  }

  return next;
}

/**
 * Remove quantidade no commit atômico.
 * Ajusta `lockedQuantity` na mesma proporção consumida (não deixa lock órfão).
 * Cobre várias pilhas do mesmo `itemId`.
 */
export function consumeInventoryQuantity(
  stacks: readonly InventoryStack[],
  itemId: string,
  quantity: number,
): { readonly ok: true; readonly stacks: InventoryStack[] } | { readonly ok: false; readonly reason: string } {
  const qty = Math.floor(quantity);
  if (!Number.isFinite(qty) || qty <= 0) {
    return { ok: false, reason: 'Quantidade inválida.' };
  }

  if (totalQuantity(stacks, itemId) < qty) {
    const hasItem = stacks.some((stack) => stack.itemId === itemId);
    return {
      ok: false,
      reason: hasItem
        ? 'Quantidade insuficiente no inventário.'
        : 'Item não encontrado no inventário.',
    };
  }

  let remaining = qty;
  const next: InventoryStack[] = [];

  for (const entry of stacks) {
    if (entry.itemId !== itemId || remaining <= 0) {
      next.push({ ...entry });
      continue;
    }

    if (entry.quantity <= remaining) {
      remaining -= entry.quantity;
      continue;
    }

    const nextQty = entry.quantity - remaining;
    const nextLocked = Math.max(0, (entry.lockedQuantity ?? 0) - remaining);
    remaining = 0;
    next.push(withAdjustedLock({ ...entry, quantity: nextQty }, nextLocked));
  }

  return { ok: true, stacks: next.filter((entry) => entry.quantity > 0) };
}
