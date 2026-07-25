// @ts-nocheck
import { emitItemTooltip } from './emitItemTooltip.js';
import { hideGameTooltip, showHintTooltip } from './showGameTooltip.js';
/** Handlers React reutilizáveis para hover de item → tooltip canônico. */
export function bindItemHoverHandlers(itemId) {
    return {
        onMouseEnter: (event) => {
            if (!itemId)
                return;
            emitItemTooltip(itemId, event.clientX, event.clientY);
        },
        onMouseLeave: () => {
            hideGameTooltip();
        },
    };
}
/** Hint curto no hover (sem title= nativo). */
export function bindHintHoverHandlers(title, lines) {
    return {
        onMouseEnter: (event) => {
            showHintTooltip(title, event.clientX, event.clientY, lines ? { lines } : undefined);
        },
        onMouseLeave: () => {
            hideGameTooltip();
        },
    };
}
/**
 * Delegação DOM para listas HTML (loot casino, slots legados).
 * Usa `[data-item-id]` no elemento hovered ou ancestral próximo.
 */
export function bindDelegatedItemTooltip(root) {
    const onEnter = (event) => {
        const target = event.target;
        if (!(target instanceof Element))
            return;
        const host = target.closest('[data-item-id]');
        if (!(host instanceof HTMLElement))
            return;
        const itemId = host.dataset.itemId?.trim();
        if (!itemId)
            return;
        const mouse = event;
        emitItemTooltip(itemId, mouse.clientX, mouse.clientY);
    };
    const onLeave = (event) => {
        const target = event.target;
        if (!(target instanceof Element))
            return;
        const host = target.closest('[data-item-id]');
        if (!host)
            return;
        const related = event.relatedTarget;
        if (related instanceof Node && host.contains(related))
            return;
        hideGameTooltip();
    };
    root.addEventListener('mouseover', onEnter);
    root.addEventListener('mouseout', onLeave);
    return () => {
        root.removeEventListener('mouseover', onEnter);
        root.removeEventListener('mouseout', onLeave);
    };
}
