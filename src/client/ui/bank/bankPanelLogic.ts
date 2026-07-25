// @ts-nocheck
import { stacksToInventorySlotsWithStacking } from '../../../shared/character/inventoryStackOps.js';
import { BANK_ITEM_SLOT_CAPACITY } from '../../../shared/bank/bankConstants.js';
import { alertSystem } from '../alertSystem.js';
export function isBankCurrencyItem(itemId) {
    return itemId === 'dollar_volt' || itemId === 'gold';
}
export function resolveStagedTransfer(stagedTransfer, inventory, bankStorage) {
    if (!stagedTransfer)
        return null;
    if (stagedTransfer.source === 'inventory') {
        const slot = inventory.slots[stagedTransfer.slotIndex];
        if (!slot?.itemId || slot.quantity <= 0)
            return null;
        if (slot.itemId !== stagedTransfer.itemId)
            return null;
        if (isBankCurrencyItem(slot.itemId))
            return null;
        if ((slot.lockedQuantity ?? 0) > 0)
            return null;
        return {
            ...stagedTransfer,
            maxQuantity: slot.quantity,
        };
    }
    const vaultSlots = stacksToInventorySlotsWithStacking(bankStorage.itemStacks, BANK_ITEM_SLOT_CAPACITY);
    const slot = vaultSlots[stagedTransfer.slotIndex];
    if (!slot?.itemId || slot.quantity <= 0)
        return null;
    if (slot.itemId !== stagedTransfer.itemId)
        return null;
    if (isBankCurrencyItem(slot.itemId))
        return null;
    return {
        ...stagedTransfer,
        maxQuantity: slot.quantity,
    };
}
export function clampBankItemQuantity(stagedTransfer, inventory, bankStorage, itemQuantity) {
    const staged = resolveStagedTransfer(stagedTransfer, inventory, bankStorage);
    if (!staged)
        return 1;
    return Math.max(1, Math.min(itemQuantity, staged.maxQuantity));
}
export function stageItemFromSlot(source, slotIndex, stagedTransfer, inventory, bankStorage) {
    if (source === 'inventory') {
        const slot = inventory.slots[slotIndex];
        if (!slot?.itemId || slot.quantity <= 0)
            return { kind: 'noop' };
        if (isBankCurrencyItem(slot.itemId))
            return { kind: 'noop' };
        if ((slot.lockedQuantity ?? 0) > 0) {
            return { kind: 'alert', message: 'Item bloqueado — aguarde a transação bancária anterior.' };
        }
        if (stagedTransfer?.source === source
            && stagedTransfer.slotIndex === slotIndex) {
            return { kind: 'clear' };
        }
        return {
            kind: 'stage',
            itemQuantity: 1,
            stagedTransfer: {
                source,
                slotIndex,
                itemId: slot.itemId,
                maxQuantity: slot.quantity,
            },
        };
    }
    const vaultSlots = stacksToInventorySlotsWithStacking(bankStorage.itemStacks, BANK_ITEM_SLOT_CAPACITY);
    const slot = vaultSlots[slotIndex];
    if (!slot?.itemId || slot.quantity <= 0)
        return { kind: 'noop' };
    if (isBankCurrencyItem(slot.itemId))
        return { kind: 'noop' };
    if (stagedTransfer?.source === source
        && stagedTransfer.slotIndex === slotIndex) {
        return { kind: 'clear' };
    }
    return {
        kind: 'stage',
        itemQuantity: 1,
        stagedTransfer: {
            source,
            slotIndex,
            itemId: slot.itemId,
            maxQuantity: slot.quantity,
        },
    };
}
export function resolveFlowDirectionForItemAction(type) {
    return type === 'DEPOSIT_ITEM' ? 'to-vault' : 'to-inventory';
}
export function notifyStageAlert(result) {
    if (result.kind === 'alert')
        alertSystem(result.message);
}
