// @ts-nocheck
import { removeEquippedItemsFromInventorySlots, removeEquippedItemsFromInventoryStacks, } from '../../../shared/character/syncInventoryWithEquipment.js';
import { getMockEconomyService } from '../../economy/economyLayer.js';
import { getPlayerInventoryStore } from '../inventory/playerInventoryStore.js';
import { getPlayerEquipmentStore } from './playerEquipmentStore.js';
/** Inventário e SET não duplicam o mesmo item — o vestido some da grade. */
export function reconcileInventoryWithEquipment() {
    const equipped = getPlayerEquipmentStore().getSnapshot().equipped;
    const inventory = getPlayerInventoryStore();
    const current = inventory.getSnapshot().slots;
    const next = removeEquippedItemsFromInventorySlots(current, equipped);
    const changed = next.length !== current.length
        || next.some((slot, index) => {
            const prev = current[index];
            return (slot.itemId !== prev?.itemId
                || slot.quantity !== prev?.quantity
                || slot.charges !== prev?.charges);
        });
    if (!changed) {
        return false;
    }
    inventory.applySlots(next);
    const mock = getMockEconomyService();
    if (mock) {
        mock.syncInventoryStacksFromClient(inventory.toStacks());
    }
    return true;
}
/** Após snapshot autoritativo (login / full-state / InventoryUpdated). */
export function initInventoryEquipmentReconcile() {
    return () => undefined;
}
export { removeEquippedItemsFromInventoryStacks };
