// @ts-nocheck
import { getCatalogItem } from '../../shared/items/itemCatalog.js';
import { uiEvents, UIEventType } from '../ui/uiEvents.js';
function escapeHtml(value) {
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
    container;
    onItemSelected = null;
    tooltipCleanups = [];
    options = { items: [], enabled: false };
    constructor(container) {
        this.container = container;
        this.container.classList.add('battle-items-menu');
    }
    setOnItemSelected(handler) {
        this.onItemSelected = handler;
    }
    render(options) {
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
    destroy() {
        this.clearTooltipListeners();
        this.container.innerHTML = '';
        this.onItemSelected = null;
    }
    bindItemTooltip(element, itemId) {
        const item = getCatalogItem(itemId);
        if (!item)
            return;
        const onEnter = (event) => {
            uiEvents.emit(UIEventType.SHOW_TOOLTIP, {
                data: { kind: 'item', data: item },
                x: event.clientX,
                y: event.clientY,
            });
        };
        const onLeave = () => {
            uiEvents.emit(UIEventType.HIDE_TOOLTIP, {});
        };
        element.addEventListener('mouseenter', onEnter);
        element.addEventListener('mouseleave', onLeave);
        this.tooltipCleanups.push(() => {
            element.removeEventListener('mouseenter', onEnter);
            element.removeEventListener('mouseleave', onLeave);
        });
    }
    clearTooltipListeners() {
        for (const off of this.tooltipCleanups)
            off();
        this.tooltipCleanups = [];
    }
}
