import type { InventoryStack } from '../character/equipmentState.js';

/** Inventário demo compartilhado — cliente e servidor (MVP: tudo na mochila, SET vazio). */
export const DEMO_STARTER_INVENTORY_STACKS: readonly InventoryStack[] = [
  { itemId: 'diario_memorias', quantity: 1 },
  { itemId: 'potion_suporte_menor', quantity: 5 },
  { itemId: 'rail_armor', quantity: 1 },
  { itemId: 'pulsing_rift_amulet', quantity: 1 },
  { itemId: 'runa_furia', quantity: 1, charges: 10 },
  { itemId: 'livro_sorte', quantity: 1, charges: 10 },
  { itemId: 'tonico_fluxo_menor', quantity: 2 },
  { itemId: 'bat_wing', quantity: 12 },
  { itemId: 'dollar_volt', quantity: 250 },
] as const;
