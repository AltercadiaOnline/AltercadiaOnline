// @ts-nocheck
import { EquipmentSlot } from '../items/itemTypes.js';
/** Slots de peças que entram no breakdown de dano/defesa (sem livro/runa). */
export const COMBAT_EQUIP_BREAKDOWN_SLOTS = [
    EquipmentSlot.Head,
    EquipmentSlot.Top,
    EquipmentSlot.Bottom,
    EquipmentSlot.Ring,
    EquipmentSlot.Amulet,
];
export const EQUIPMENT_SLOT_COMBAT_LABELS = {
    [EquipmentSlot.Head]: 'Elmo',
    [EquipmentSlot.Top]: 'Armadura',
    [EquipmentSlot.Bottom]: 'Perneiras',
    [EquipmentSlot.Ring]: 'Anel',
    [EquipmentSlot.Amulet]: 'Amuleto',
};
export function isCombatEquipBreakdownSlot(key) {
    return COMBAT_EQUIP_BREAKDOWN_SLOTS.includes(key);
}
export function resolveEquipmentSlotCombatLabel(slot) {
    if (isCombatEquipBreakdownSlot(slot)) {
        return EQUIPMENT_SLOT_COMBAT_LABELS[slot];
    }
    if (slot === EquipmentSlot.Book)
        return 'Livro';
    if (slot === EquipmentSlot.Rune)
        return 'Runa';
    return slot;
}
