import { cancelPendingItemTooltipEnrichment } from './itemTooltipEpoch.js';
import { uiEvents, UIEventType } from '../uiEvents.js';
import type { TooltipData } from './tooltipTypes.js';
import type { TooltipPlacement } from './tooltipPlacement.js';

export type ShowGameTooltipArgs = {
  readonly data: TooltipData;
  readonly x: number;
  readonly y: number;
  readonly placement?: TooltipPlacement;
};

/** Dispara o tooltip flutuante canônico (singleton `.game-tooltip`). */
export function showGameTooltip(args: ShowGameTooltipArgs): void {
  uiEvents.emit(UIEventType.SHOW_TOOLTIP, {
    data: args.data,
    x: args.x,
    y: args.y,
    ...(args.placement ? { placement: args.placement } : {}),
  });
}

export function hideGameTooltip(): void {
  cancelPendingItemTooltipEnrichment();
  uiEvents.emit(UIEventType.HIDE_TOOLTIP, {});
}

/** Atalho para hints curtos (política de loja, bloqueio, etc.). */
export function showHintTooltip(
  title: string,
  clientX: number,
  clientY: number,
  options?: {
    readonly lines?: readonly string[];
    readonly placement?: TooltipPlacement;
  },
): void {
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
