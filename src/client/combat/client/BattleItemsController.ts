import type { ActiveConsumableStack } from '../../../shared/types.js';
import { getBattleHudBridge } from '../../app/bridge/battleHudBridge.js';
import { resolveBattleConsumableRows } from './battleConsumables.js';

export type BattleItemsControllerOptions = {
  readonly onUseItem: (itemId: string, actorId: string) => void;
};

/** Orquestra paleta de consumíveis — estado canônico via battleHudStore (React). */
export class BattleItemsController {
  private readonly onUseItem: (itemId: string, actorId: string) => void;
  private actorId: string | null = null;
  private stacks: ActiveConsumableStack[] = [];
  private menuEnabled = false;

  constructor(options: BattleItemsControllerOptions) {
    this.onUseItem = options.onUseItem;
    this.publishPalette();
  }

  syncItems(
    actorId: string | null,
    stacks: readonly ActiveConsumableStack[],
    enabled: boolean,
  ): void {
    this.actorId = actorId;
    this.stacks = stacks.map((row) => ({ ...row }));
    this.menuEnabled = enabled;
    this.publishPalette();
  }

  decrementConsumable(itemId: string): void {
    const index = this.stacks.findIndex((row) => row.itemId === itemId);
    if (index < 0) return;
    const current = this.stacks[index]!;
    const nextQty = Math.max(0, current.quantity - 1);
    if (nextQty === 0) {
      this.stacks.splice(index, 1);
    } else {
      this.stacks[index] = { ...current, quantity: nextQty };
    }
    this.publishPalette();
  }

  lock(): void {
    this.menuEnabled = false;
    this.publishPalette();
  }

  destroy(): void {
    /* noop — sem DOM */
  }

  tryUseItem(itemId: string): void {
    this.useItem(itemId);
  }

  private useItem(itemId: string): void {
    if (!this.menuEnabled || !this.actorId) return;
    const row = this.stacks.find((entry) => entry.itemId === itemId);
    if (!row || row.quantity < 1) return;
    this.onUseItem(itemId, this.actorId);
  }

  private publishPalette(): void {
    getBattleHudBridge().setItemsPalette(
      resolveBattleConsumableRows(this.stacks),
      this.menuEnabled,
    );
  }
}
