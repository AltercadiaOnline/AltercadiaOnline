import type { EquippedSlots } from './equipmentState.js';
import {
  EquipmentUiSlotId,
  UI_SLOT_TO_EQUIPMENT_SLOT,
  type EquipmentUiGridState,
  type EquipmentUiSlotId as UiSlotId,
} from './equipmentUiSlots.js';
import {
  getBookDefinition,
  getEquipableItem,
  getRuneDefinition,
} from '../items/itemCatalog.js';
import { alternateBottomUiSlot, resolveCatalogBottomUiSlot } from './bottomEquipmentUiSlot.js';
import { EquipmentSlot, type EquipmentSlotId } from '../items/itemTypes.js';

const UI_SLOT_SEARCH_ORDER: readonly UiSlotId[] = [
  EquipmentUiSlotId.Amulet,
  EquipmentUiSlotId.Helmet,
  EquipmentUiSlotId.Armor,
  EquipmentUiSlotId.Legs,
  EquipmentUiSlotId.Boots,
  EquipmentUiSlotId.RingLeft,
  EquipmentUiSlotId.RingRight,
  EquipmentUiSlotId.Books,
  EquipmentUiSlotId.Runes,
];

export type EquippedField = keyof EquippedSlots;

/** Campo autoritativo (`head`, `top`, `rune`, …) compatível com o item. */
export function resolveEquippedFieldForItem(itemId: string): EquippedField | null {
  const equip = getEquipableItem(itemId);
  if (equip) {
    return equip.slot as EquippedField;
  }
  if (getRuneDefinition(itemId)) return 'rune';
  if (getBookDefinition(itemId)) return 'book';
  return null;
}

/** Slot visual do SET lateral compatível com o item. */
export function findCompatibleEquipmentUiSlot(itemId: string): UiSlotId | null {
  const equip = getEquipableItem(itemId);
  if (equip) {
    if (equip.slot === EquipmentSlot.Bottom) {
      return resolveCatalogBottomUiSlot(itemId);
    }
    for (const slotId of UI_SLOT_SEARCH_ORDER) {
      const mapped = UI_SLOT_TO_EQUIPMENT_SLOT[slotId];
      if (mapped === equip.slot) return slotId;
    }
    return null;
  }

  if (getRuneDefinition(itemId)) return EquipmentUiSlotId.Runes;
  if (getBookDefinition(itemId)) return EquipmentUiSlotId.Books;
  return null;
}

/** Campo autoritativo para um slot visual do SET (desequipar). */
export function resolveEquippedFieldForUiSlot(
  uiSlotId: UiSlotId,
  itemId: string | null,
): EquippedField | null {
  if (uiSlotId === EquipmentUiSlotId.Card) return null;

  if (uiSlotId === EquipmentUiSlotId.Books) return 'book';
  if (uiSlotId === EquipmentUiSlotId.Runes) return 'rune';
  if (uiSlotId === EquipmentUiSlotId.RingLeft || uiSlotId === EquipmentUiSlotId.RingRight) {
    return 'ring';
  }

  const mapped = UI_SLOT_TO_EQUIPMENT_SLOT[uiSlotId] as EquipmentSlotId | undefined;
  if (!mapped) return null;

  if (itemId) {
    const field = resolveEquippedFieldForItem(itemId);
    if (field) return field;
  }

  return mapped as EquippedField;
}

export function canItemFitUiSlot(itemId: string, uiSlotId: UiSlotId): boolean {
  if (uiSlotId === EquipmentUiSlotId.Card) return false;

  if (uiSlotId === EquipmentUiSlotId.Books) return Boolean(getBookDefinition(itemId));
  if (uiSlotId === EquipmentUiSlotId.Runes) return Boolean(getRuneDefinition(itemId));

  const expected = UI_SLOT_TO_EQUIPMENT_SLOT[uiSlotId];
  if (!expected) return false;

  const equip = getEquipableItem(itemId);
  if (!equip) return false;

  if (uiSlotId === EquipmentUiSlotId.RingLeft || uiSlotId === EquipmentUiSlotId.RingRight) {
    return equip.slot === EquipmentSlot.Ring;
  }
  if (uiSlotId === EquipmentUiSlotId.Legs || uiSlotId === EquipmentUiSlotId.Boots) {
    return equip.slot === EquipmentSlot.Bottom;
  }

  return equip.slot === expected;
}

/** Escolhe slot visual — respeita preferência do drag e preenche anel/perna vazio primeiro. */
export function resolveTargetUiSlotForEquip(
  grid: EquipmentUiGridState,
  itemId: string,
  preferredUiSlot?: UiSlotId,
): UiSlotId | null {
  if (preferredUiSlot && canItemFitUiSlot(itemId, preferredUiSlot)) {
    return preferredUiSlot;
  }

  const equip = getEquipableItem(itemId);
  if (equip?.slot === EquipmentSlot.Ring) {
    if (!grid[EquipmentUiSlotId.RingLeft]) return EquipmentUiSlotId.RingLeft;
    if (!grid[EquipmentUiSlotId.RingRight]) return EquipmentUiSlotId.RingRight;
    return EquipmentUiSlotId.RingLeft;
  }
  if (equip?.slot === EquipmentSlot.Bottom) {
    const primary = resolveCatalogBottomUiSlot(itemId);
    const secondary = alternateBottomUiSlot(primary);
    if (!grid[primary]) return primary;
    if (!grid[secondary]) return secondary;
    return primary;
  }

  return findCompatibleEquipmentUiSlot(itemId);
}
