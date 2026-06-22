import type { InventoryStack } from './equipmentState.js';

export type InventoryChecksumRow = {
  readonly itemId: string;
  readonly quantity: number;
  readonly charges?: number;
  readonly lockedQuantity?: number;
};

function canonicalInventoryRows(
  items: readonly InventoryChecksumRow[],
): InventoryChecksumRow[] {
  return items
    .map((row) => {
      const quantity = Math.max(0, Math.floor(row.quantity));
      if (quantity <= 0) return null;

      const next: {
        itemId: string;
        quantity: number;
        charges?: number;
        lockedQuantity?: number;
      } = {
        itemId: row.itemId,
        quantity,
      };

      if (row.charges !== undefined) {
        next.charges = Math.max(0, Math.floor(row.charges));
      }

      const lockedQuantity = Math.max(0, Math.floor(row.lockedQuantity ?? 0));
      if (lockedQuantity > 0) {
        next.lockedQuantity = lockedQuantity;
      }

      return next;
    })
    .filter((row): row is InventoryChecksumRow => row !== null)
    .sort((left, right) => left.itemId.localeCompare(right.itemId));
}

/** Hash determinístico FNV-1a (hex) — inventário autoritativo para INVENTORY_UPDATE. */
export function computeInventoryChecksum(items: readonly InventoryChecksumRow[]): string {
  const canonical = canonicalInventoryRows(items);
  const serialized = JSON.stringify(canonical);

  let hash = 0x811c9dc5;
  for (let index = 0; index < serialized.length; index += 1) {
    hash ^= serialized.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function computeInventoryChecksumFromStacks(
  stacks: readonly InventoryStack[],
): string {
  return computeInventoryChecksum(
    stacks.map((stack) => ({
      itemId: stack.itemId,
      quantity: stack.quantity,
      ...(stack.charges !== undefined ? { charges: stack.charges } : {}),
      ...(stack.lockedQuantity !== undefined ? { lockedQuantity: stack.lockedQuantity } : {}),
    })),
  );
}
