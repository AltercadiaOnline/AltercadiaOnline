import type { InventorySnapshot } from '../character/inventorySlots.js';
import { CRAFT_RECIPES, type CraftRecipe } from './craftRecipes.js';

export type { CraftRecipe } from './craftRecipes.js';

export type CraftInventoryRow = {
  readonly itemId: string;
  readonly quantity: number;
};

export type CraftItemRequest = {
  readonly craftStationId: string;
  readonly recipeId: string;
  readonly quantity: number;
};

export type CraftValidationCode =
  | 'RECIPE_NOT_FOUND'
  | 'STATION_MISMATCH'
  | 'INVALID_QUANTITY'
  | 'INSUFFICIENT_MATERIALS';

export type CraftValidationResult =
  | { readonly ok: true; readonly recipe: CraftRecipe; readonly batches: number }
  | { readonly ok: false; readonly code: CraftValidationCode; readonly message: string };

export function findCraftRecipe(recipeId: string): CraftRecipe | null {
  return CRAFT_RECIPES.find((recipe) => recipe.id === recipeId) ?? null;
}

export function listCraftRecipesForStation(craftStationId: string): readonly CraftRecipe[] {
  return CRAFT_RECIPES.filter((recipe) => recipe.craftStationId === craftStationId);
}

/** Agrega slots do snapshot UI em contagens por itemId (espelho — validação no servidor). */
export function inventorySnapshotToCraftRows(
  snapshot: InventorySnapshot,
): readonly CraftInventoryRow[] {
  const totals = new Map<string, number>();
  for (const slot of snapshot.slots) {
    if (!slot.itemId || slot.quantity <= 0) continue;
    totals.set(slot.itemId, (totals.get(slot.itemId) ?? 0) + slot.quantity);
  }
  return [...totals.entries()].map(([itemId, quantity]) => ({ itemId, quantity }));
}

function countInventoryItem(inventory: readonly CraftInventoryRow[], itemId: string): number {
  return inventory.find((row) => row.itemId === itemId)?.quantity ?? 0;
}

export function resolveMaxCraftBatches(
  recipe: CraftRecipe,
  inventory: readonly CraftInventoryRow[],
): number {
  let maxBatches = Number.POSITIVE_INFINITY;
  for (const input of recipe.inputs) {
    const owned = countInventoryItem(inventory, input.itemId);
    const batches = Math.floor(owned / input.quantity);
    maxBatches = Math.min(maxBatches, batches);
  }
  if (!Number.isFinite(maxBatches)) return 0;
  return Math.max(0, maxBatches);
}

export function validateCraftItemRequest(
  request: CraftItemRequest,
  inventory: readonly CraftInventoryRow[],
): CraftValidationResult {
  const recipe = findCraftRecipe(request.recipeId);
  if (!recipe) {
    return {
      ok: false,
      code: 'RECIPE_NOT_FOUND',
      message: 'Receita desconhecida.',
    };
  }

  if (recipe.craftStationId !== request.craftStationId) {
    return {
      ok: false,
      code: 'STATION_MISMATCH',
      message: 'Esta receita não pertence a esta oficina.',
    };
  }

  const batches = Math.floor(request.quantity);
  if (!Number.isInteger(batches) || batches < 1) {
    return {
      ok: false,
      code: 'INVALID_QUANTITY',
      message: 'Quantidade de craft inválida.',
    };
  }

  for (const input of recipe.inputs) {
    const required = input.quantity * batches;
    const owned = countInventoryItem(inventory, input.itemId);
    if (owned < required) {
      return {
        ok: false,
        code: 'INSUFFICIENT_MATERIALS',
        message: `Material insuficiente: ${input.itemId} (precisa ×${required}, possui ×${owned}).`,
      };
    }
  }

  return { ok: true, recipe, batches };
}
