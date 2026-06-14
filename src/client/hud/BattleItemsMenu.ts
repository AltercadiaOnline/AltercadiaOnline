import { getCatalogItem } from '../../shared/items/itemCatalog.js';
import { uiEvents, UIEventType } from '../ui/uiEvents.js';
import type { BattleConsumableRow } from './battleConsumables.js';

export type BattleItemsMenuRenderOptions = {
  readonly items: readonly BattleConsumableRow[];
  readonly enabled: boolean;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Paleta de consumíveis de combate — clique usa o item imediatamente.
 */
export class BattleItemsMenu {
  private readonly container: HTMLElement;
  private onItemSelected: ((itemId: string) => void) | null = null;
  private tooltipCleanups: Array<() => void> = [];
  private options: BattleItemsMenuRenderOptions = { items: [], enabled: false };

  constructor(container: HTMLElement) {
    this.container = container;
    this.container.classList.add('battle-items-menu');
  }

  setOnItemSelected(handler: (itemId: string) => void): void {
    this.onItemSelected = handler;
  }

  render(options: BattleItemsMenuRenderOptions): void {
    this.clearTooltipListeners();
    this.options = options;
    this.container.innerHTML = '';

    if (options.items.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'battle-items-menu__empty';
      empty.textContent = 'Nenhum consumível de combate no inventário.';
      this.container.appendChild(empty);
      this.container.classList.toggle('is-disabled', !options.enabled);
      return;
    }

    for (const item of options.items) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'battle-menu-btn battle-item-slot slot-item--kind-consumable';
      btn.dataset.itemId = item.itemId;
      btn.disabled = !options.enabled || item.quantity < 1;
      btn.innerHTML = `
        <span class="battle-item-slot__abbrev" aria-hidden="true">${escapeHtml(item.abbrev)}</span>
        <span class="battle-item-slot__name">${escapeHtml(item.name)}</span>
        <span class="battle-item-slot__qty">×${item.quantity}</span>
      `;

      if (options.enabled && item.quantity > 0) {
        btn.addEventListener('click', () => {
          this.onItemSelected?.(item.itemId);
        });
      }

      this.bindItemTooltip(btn, item.itemId);
      this.container.appendChild(btn);
    }

    this.container.classList.toggle('is-disabled', !options.enabled);
    this.container.toggleAttribute('aria-disabled', !options.enabled);
  }

  destroy(): void {
    this.clearTooltipListeners();
    this.container.innerHTML = '';
    this.onItemSelected = null;
  }

  private bindItemTooltip(element: HTMLElement, itemId: string): void {
    const item = getCatalogItem(itemId);
    if (!item) return;

    const onEnter = (event: MouseEvent): void => {
      uiEvents.emit(UIEventType.SHOW_TOOLTIP, {
        data: { kind: 'item', data: item },
        x: event.clientX,
        y: event.clientY,
      });
    };
    const onLeave = (): void => {
      uiEvents.emit(UIEventType.HIDE_TOOLTIP, {});
    };

    element.addEventListener('mouseenter', onEnter);
    element.addEventListener('mouseleave', onLeave);
    this.tooltipCleanups.push(() => {
      element.removeEventListener('mouseenter', onEnter);
      element.removeEventListener('mouseleave', onLeave);
    });
  }

  private clearTooltipListeners(): void {
    for (const off of this.tooltipCleanups) off();
    this.tooltipCleanups = [];
  }
}
