import type { ActiveConsumableStack } from '../../shared/types.js';
import { BattleItemsMenu } from './BattleItemsMenu.js';
import { resolveBattleConsumableRows } from './battleConsumables.js';

export type BattleItemsControllerOptions = {
  readonly menuContainer: HTMLElement;
  readonly onUseItem: (itemId: string, actorId: string) => void;
};

/**
 * Orquestra a paleta de consumíveis — espelha `activeConsumables` do servidor.
 */
export class BattleItemsController {
  private readonly menu: BattleItemsMenu;
  private readonly onUseItem: (itemId: string, actorId: string) => void;
  private actorId: string | null = null;
  private stacks: ActiveConsumableStack[] = [];
  private menuEnabled = false;

  constructor(options: BattleItemsControllerOptions) {
    this.onUseItem = options.onUseItem;
    this.menu = new BattleItemsMenu(options.menuContainer);
    this.menu.setOnItemSelected((itemId) => {
      this.useItem(itemId);
    });
    this.renderMenu();
  }

  syncItems(
    actorId: string | null,
    stacks: readonly ActiveConsumableStack[],
    enabled: boolean,
  ): void {
    this.actorId = actorId;
    this.stacks = stacks.map((row) => ({ ...row }));
    this.menuEnabled = enabled;
    this.renderMenu();
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
    this.renderMenu();
  }

  lock(): void {
    this.menuEnabled = false;
    this.renderMenu();
  }

  destroy(): void {
    this.menu.destroy();
  }

  private useItem(itemId: string): void {
    if (!this.menuEnabled || !this.actorId) return;
    const row = this.stacks.find((entry) => entry.itemId === itemId);
    if (!row || row.quantity < 1) return;
    this.onUseItem(itemId, this.actorId);
  }

  private renderMenu(): void {
    this.menu.render({
      items: resolveBattleConsumableRows(this.stacks),
      enabled: this.menuEnabled,
    });
  }
}
