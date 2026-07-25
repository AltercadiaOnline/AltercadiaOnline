import type { MouseEvent as ReactMouseEvent } from 'react';
import { emitItemTooltip } from './emitItemTooltip.js';
import { hideGameTooltip, showHintTooltip } from './showGameTooltip.js';

/** Handlers React reutilizáveis para hover de item → tooltip canônico. */
export function bindItemHoverHandlers(itemId: string | null | undefined): {
  readonly onMouseEnter: (event: ReactMouseEvent) => void;
  readonly onMouseLeave: () => void;
} {
  return {
    onMouseEnter: (event) => {
      if (!itemId) return;
      emitItemTooltip(itemId, event.clientX, event.clientY);
    },
    onMouseLeave: () => {
      hideGameTooltip();
    },
  };
}

/** Hint curto no hover (sem title= nativo). */
export function bindHintHoverHandlers(
  title: string,
  lines?: readonly string[],
): {
  readonly onMouseEnter: (event: ReactMouseEvent) => void;
  readonly onMouseLeave: () => void;
} {
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
export function bindDelegatedItemTooltip(root: ParentNode): () => void {
  const onEnter = (event: Event): void => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const host = target.closest('[data-item-id]');
    if (!(host instanceof HTMLElement)) return;
    const itemId = host.dataset.itemId?.trim();
    if (!itemId) return;
    const mouse = event as MouseEvent;
    emitItemTooltip(itemId, mouse.clientX, mouse.clientY);
  };
  const onLeave = (event: Event): void => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const host = target.closest('[data-item-id]');
    if (!host) return;
    const related = (event as MouseEvent).relatedTarget;
    if (related instanceof Node && host.contains(related)) return;
    hideGameTooltip();
  };

  root.addEventListener('mouseover', onEnter);
  root.addEventListener('mouseout', onLeave);
  return () => {
    root.removeEventListener('mouseover', onEnter);
    root.removeEventListener('mouseout', onLeave);
  };
}
