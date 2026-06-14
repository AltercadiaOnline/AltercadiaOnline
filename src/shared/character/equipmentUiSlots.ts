import type { EquipmentSlotId } from '../items/itemTypes.js';
import { EquipmentSlot } from '../items/itemTypes.js';
import type { EquippedSlots } from './equipmentState.js';
import { resolveCatalogBottomUiSlot } from './bottomEquipmentUiSlot.js';
/** IDs dos 10 slots visuais do HUD de SET (grid 4×3). */
export const EquipmentUiSlotId = {
  Amulet: 'amulet',
  Helmet: 'helmet',
  Card: 'card',
  Books: 'books',
  Armor: 'armor',
  Runes: 'runes',
  RingLeft: 'ring_left',
  Legs: 'legs',
  RingRight: 'ring_right',
  Boots: 'boots',
} as const;

export type EquipmentUiSlotId =
  (typeof EquipmentUiSlotId)[keyof typeof EquipmentUiSlotId];

export const EQUIPMENT_UI_SLOT_ORDER: readonly EquipmentUiSlotId[] = [
  EquipmentUiSlotId.Amulet,
  EquipmentUiSlotId.Helmet,
  EquipmentUiSlotId.Card,
  EquipmentUiSlotId.Books,
  EquipmentUiSlotId.Armor,
  EquipmentUiSlotId.Runes,
  EquipmentUiSlotId.RingLeft,
  EquipmentUiSlotId.Legs,
  EquipmentUiSlotId.RingRight,
  EquipmentUiSlotId.Boots,
];

export const EQUIPMENT_UI_SLOT_LABELS: Record<EquipmentUiSlotId, string> = {
  [EquipmentUiSlotId.Amulet]: 'Amuleto',
  [EquipmentUiSlotId.Helmet]: 'Elmo',
  [EquipmentUiSlotId.Card]: 'Card',
  [EquipmentUiSlotId.Books]: 'Livros',
  [EquipmentUiSlotId.Armor]: 'Armadura',
  [EquipmentUiSlotId.Runes]: 'Runas',
  [EquipmentUiSlotId.RingLeft]: 'Anel E',
  [EquipmentUiSlotId.Legs]: 'Calças',
  [EquipmentUiSlotId.RingRight]: 'Anel D',
  [EquipmentUiSlotId.Boots]: 'Botas',
};

/** Mapeamento slot UI → slot econômico (quando aplicável). */
export const UI_SLOT_TO_EQUIPMENT_SLOT: Partial<Record<EquipmentUiSlotId, EquipmentSlotId>> = {
  [EquipmentUiSlotId.Amulet]: EquipmentSlot.Amulet,
  [EquipmentUiSlotId.Helmet]: EquipmentSlot.Head,
  [EquipmentUiSlotId.Books]: EquipmentSlot.Book,
  [EquipmentUiSlotId.Armor]: EquipmentSlot.Top,
  [EquipmentUiSlotId.Runes]: EquipmentSlot.Rune,
  [EquipmentUiSlotId.RingLeft]: EquipmentSlot.Ring,
  [EquipmentUiSlotId.RingRight]: EquipmentSlot.Ring,
  [EquipmentUiSlotId.Legs]: EquipmentSlot.Bottom,
  [EquipmentUiSlotId.Boots]: EquipmentSlot.Bottom,
};

export type EquipmentUiGridState = Record<EquipmentUiSlotId, string | null>;

export function createEmptyEquipmentUiGrid(): EquipmentUiGridState {
  return {
    [EquipmentUiSlotId.Amulet]: null,
    [EquipmentUiSlotId.Helmet]: null,
    [EquipmentUiSlotId.Card]: null,
    [EquipmentUiSlotId.Books]: null,
    [EquipmentUiSlotId.Armor]: null,
    [EquipmentUiSlotId.Runes]: null,
    [EquipmentUiSlotId.RingLeft]: null,
    [EquipmentUiSlotId.Legs]: null,
    [EquipmentUiSlotId.RingRight]: null,
    [EquipmentUiSlotId.Boots]: null,
  };
}

/** Converte grade UI → snapshot de equipamento do servidor/economia. */
export function equipmentUiGridToEquipped(slots: EquipmentUiGridState): EquippedSlots {
  const bottom = slots.boots ?? slots.legs ?? null;
  const ring = slots.ring_left ?? slots.ring_right ?? null;

  return {
    head: slots.helmet,
    top: slots.armor,
    bottom,
    ring,
    amulet: slots.amulet,
    book: slots.books,
    rune: slots.runes,
  };
}

/** Hidrata a grade UI a partir do equipamento autoritativo. */
export function equippedToEquipmentUiGrid(equipped: EquippedSlots): EquipmentUiGridState {
  const slots = createEmptyEquipmentUiGrid();
  slots.helmet = equipped.head ?? null;
  slots.armor = equipped.top ?? null;
  slots.amulet = equipped.amulet ?? null;
  slots.books = equipped.book ?? null;
  slots.runes = equipped.rune ?? null;
  slots.ring_left = equipped.ring ?? null;

  if (equipped.bottom) {
    slots[resolveCatalogBottomUiSlot(equipped.bottom)] = equipped.bottom;
  }

  return slots;
}
