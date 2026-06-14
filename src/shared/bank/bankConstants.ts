import { INVENTORY_SLOT_COUNT } from '../character/inventorySlots.js';

/** NPC autorizado para operações bancárias. */
export const BANK_NPC_ID = 'banqueiro';

/** Raio extra quando o cliente reporta posição no clique (compensa fila de MOVE_INTENT). */
export const BANK_CLIENT_REPORTED_RADIUS_TILES = 3;

/** Capacidade de slots de itens no cofre (múltiplo de 40 — paginação espelha o inventário). */
export const BANK_ITEM_SLOT_CAPACITY = INVENTORY_SLOT_COUNT * 2;

/** Colunas da grade do HUD do banco (8×5 = 40 slots visíveis por página). */
export const BANK_HUD_GRID_COLUMNS = 8;

export const BANK_HUD_GRID_ROWS = INVENTORY_SLOT_COUNT / BANK_HUD_GRID_COLUMNS;

export const BankCurrencyType = {
  Volts: 'volts',
  Alter: 'alter',
} as const;

export type BankCurrencyTypeId = (typeof BankCurrencyType)[keyof typeof BankCurrencyType];

export const BANK_TRANSACTION_SUCCESS_MESSAGE = 'Transação Efetuada';
