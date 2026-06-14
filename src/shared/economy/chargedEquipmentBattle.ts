import type { EquippedSlots, InventoryStack } from '../character/equipmentState.js';
import {
  isChargedEquipmentItemId,
  resolveEquippedStackCharges,
  resolveStackDurabilityCharges,
} from '../items/chargedEquipment.js';

export type ChargedEquipmentBattleConsumptionResult = {
  readonly runeChargesAfter: number | null;
  readonly bookChargesAfter: number | null;
  readonly runeDepleted: boolean;
  readonly bookDepleted: boolean;
};

type MutableProfile = {
  inventory: InventoryStack[];
  equipped: EquippedSlots;
};

function decrementEquippedSlot(
  profile: MutableProfile,
  slot: 'rune' | 'book',
): { readonly chargesAfter: number | null; readonly depleted: boolean } {
  const itemId = profile.equipped[slot];
  if (!itemId || !isChargedEquipmentItemId(itemId)) {
    return { chargesAfter: null, depleted: false };
  }

  const rowIndex = profile.inventory.findIndex((row) => row.itemId === itemId);
  if (rowIndex < 0) {
    profile.equipped = { ...profile.equipped, [slot]: null };
    return { chargesAfter: 0, depleted: true };
  }

  const row = profile.inventory[rowIndex]!;
  const before = resolveStackDurabilityCharges(row);
  const after = Math.max(0, before - 1);

  if (after <= 0) {
    profile.inventory = profile.inventory.filter((_, index) => index !== rowIndex);
    profile.equipped = { ...profile.equipped, [slot]: null };
    return { chargesAfter: 0, depleted: true };
  }

  profile.inventory[rowIndex] = { ...row, charges: after };
  return { chargesAfter: after, depleted: false };
}

/** −1 carga por batalha. Ao chegar em 0: remove o stack do inventário e limpa o slot equipado. */
export function applyChargedEquipmentBattleParticipation(
  profile: MutableProfile,
): ChargedEquipmentBattleConsumptionResult {
  const rune = decrementEquippedSlot(profile, 'rune');
  const book = decrementEquippedSlot(profile, 'book');
  return {
    runeChargesAfter: rune.chargesAfter,
    bookChargesAfter: book.chargesAfter,
    runeDepleted: rune.depleted,
    bookDepleted: book.depleted,
  };
}

export function resolveEffectiveEquippedForCombat(
  equipped: EquippedSlots,
  inventory: readonly InventoryStack[],
): EquippedSlots {
  const runeId = equipped.rune;
  const bookId = equipped.book;
  return {
    ...equipped,
    rune: runeId && resolveEquippedStackCharges(inventory, runeId) > 0 ? runeId : null,
    book: bookId && resolveEquippedStackCharges(inventory, bookId) > 0 ? bookId : null,
  };
}
