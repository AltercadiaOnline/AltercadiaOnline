// @ts-nocheck
import { getTooltip } from '../components/Tooltip.js';
/**
 * Vincula mouseenter/mouseleave em slots com `data-item-id` ou `data-move-id`.
 * Retorna função de cleanup para evitar memory leaks após re-render.
 */
export function bindSlotTooltips(container, options = {}) {
    const itemAttr = options.itemIdAttribute ?? 'data-item-id';
    const moveAttr = options.moveIdAttribute ?? 'data-move-id';
    const tooltip = getTooltip();
    const selector = `[${itemAttr}], [${moveAttr}]`;
    const slots = container.querySelectorAll(selector);
    const resolveTarget = (element) => {
        const itemId = element.getAttribute(itemAttr);
        if (itemId)
            return { kind: 'item', id: itemId };
        const moveId = element.getAttribute(moveAttr);
        if (moveId)
            return { kind: 'move', id: moveId };
        return null;
    };
    const handlers = new Map();
    for (const slot of slots) {
        const onEnter = (event) => {
            const target = resolveTarget(slot);
            if (!target)
                return;
            tooltip.show(target, event.clientX, event.clientY);
        };
        const onLeave = () => {
            tooltip.hide();
        };
        slot.addEventListener('mouseenter', onEnter);
        slot.addEventListener('mouseleave', onLeave);
        handlers.set(slot, { enter: onEnter, leave: onLeave });
    }
    return () => {
        for (const [slot, { enter, leave }] of handlers) {
            slot.removeEventListener('mouseenter', enter);
            slot.removeEventListener('mouseleave', leave);
        }
        handlers.clear();
        tooltip.hide();
    };
}
