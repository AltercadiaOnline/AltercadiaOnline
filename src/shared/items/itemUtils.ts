import { CATALOG_ENTRIES } from './itemCatalogEntries.js';
import { ItemEffectValueType } from './itemSchema.js';

/** Entrada do SET equipado — referência a um item por id (null = slot vazio). */
export type EquipmentSlot = {
  readonly itemId: string | null;
};

/** Bônus totais agregados a partir dos efeitos equipados. */
export type PlayerTotalStats = {
  defesa: number;
  vida: number;
  agilidade: number;
  critico: number;
  forca: number;
};

const STAT_TO_TOTAL_KEY: Record<string, keyof PlayerTotalStats> = {
  DEF: 'defesa',
  HP: 'vida',
  AGI: 'agilidade',
  CRIT: 'critico',
  STR: 'forca',
};

export function createEmptyTotalStats(): PlayerTotalStats {
  return {
    defesa: 0,
    vida: 0,
    agilidade: 0,
    critico: 0,
    forca: 0,
  };
}

/**
 * Percorre o SET, resolve cada item via catálogo e soma efeitos.
 * PERCENT e FLAT acumulam no mesmo contador por stat.
 * Efeitos `combatOnly` (runas condicionais) são ignorados.
 */
export function calculateTotalStats(playerEquipment: readonly EquipmentSlot[]): PlayerTotalStats {
  const totals = createEmptyTotalStats();

  for (const slot of playerEquipment) {
    if (!slot.itemId) continue;

    const item = CATALOG_ENTRIES.find((entry) => entry.id === slot.itemId);
    if (!item) continue;

    for (const effect of item.effects) {
      if (effect.combatOnly) continue;

      const key = STAT_TO_TOTAL_KEY[effect.stat];
      if (!key) continue;

      totals[key] += effect.value;
    }
  }

  return totals;
}

/** Converte grid UI (valores por slot) em lista para `calculateTotalStats`. */
export function equipmentIdsToSlots(
  itemIds: readonly (string | null | undefined)[],
): EquipmentSlot[] {
  return itemIds
    .filter((id): id is string | null => id !== undefined)
    .map((itemId) => ({ itemId: itemId ?? null }));
}
