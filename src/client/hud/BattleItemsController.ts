// @ts-nocheck
import { getBattleHudBridge } from '../app/bridge/battleHudBridge.js';
import { resolveBattleConsumableRows } from './battleConsumables.js';
/** Orquestra paleta de consumíveis — estado canônico via battleHudStore (React). */
export class BattleItemsController {
    onUseItem;
    actorId = null;
    stacks = [];
    menuEnabled = false;
    constructor(options) {
        this.onUseItem = options.onUseItem;
        this.publishPalette();
    }
    syncItems(actorId, stacks, enabled) {
        this.actorId = actorId;
        this.stacks = stacks.map((row) => ({ ...row }));
        this.menuEnabled = enabled;
        this.publishPalette();
    }
    decrementConsumable(itemId) {
        const index = this.stacks.findIndex((row) => row.itemId === itemId);
        if (index < 0)
            return;
        const current = this.stacks[index];
        const nextQty = Math.max(0, current.quantity - 1);
        if (nextQty === 0) {
            this.stacks.splice(index, 1);
        }
        else {
            this.stacks[index] = { ...current, quantity: nextQty };
        }
        this.publishPalette();
    }
    lock() {
        this.menuEnabled = false;
        this.publishPalette();
    }
    destroy() {
        /* noop — sem DOM */
    }
    tryUseItem(itemId) {
        this.useItem(itemId);
    }
    useItem(itemId) {
        if (!this.menuEnabled || !this.actorId)
            return;
        const row = this.stacks.find((entry) => entry.itemId === itemId);
        if (!row || row.quantity < 1)
            return;
        this.onUseItem(itemId, this.actorId);
    }
    publishPalette() {
        getBattleHudBridge().setItemsPalette(resolveBattleConsumableRows(this.stacks), this.menuEnabled);
    }
}
