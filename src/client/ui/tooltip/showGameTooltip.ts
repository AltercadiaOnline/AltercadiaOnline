// @ts-nocheck
import { cancelPendingItemTooltipEnrichment } from './itemTooltipEpoch.js';
import { uiEvents, UIEventType } from '../uiEvents.js';
/** Dispara o tooltip flutuante canônico (singleton `.game-tooltip`). */
export function showGameTooltip(args) {
    uiEvents.emit(UIEventType.SHOW_TOOLTIP, {
        data: args.data,
        x: args.x,
        y: args.y,
        ...(args.placement ? { placement: args.placement } : {}),
    });
}
export function hideGameTooltip() {
    cancelPendingItemTooltipEnrichment();
    uiEvents.emit(UIEventType.HIDE_TOOLTIP, {});
}
/** Atalho para hints curtos (política de loja, bloqueio, etc.). */
export function showHintTooltip(title, clientX, clientY, options) {
    showGameTooltip({
        data: {
            kind: 'hint',
            title,
            ...(options?.lines ? { lines: options.lines } : {}),
        },
        x: clientX,
        y: clientY,
        ...(options?.placement ? { placement: options.placement } : {}),
    });
}
