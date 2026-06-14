import { uiEvents, UIEventType } from '../uiEvents.js';
import { readProgressionTooltipPayload } from './progressionTooltipAttrs.js';

let activeBar: HTMLElement | null = null;
let teardown: (() => void) | null = null;

/** Hover nas barras `data-progression-tooltip` — tooltip acima com XP restante. */
export function initProgressionTooltipDelegation(root: Document | HTMLElement = document): () => void {
  teardownProgressionTooltipDelegation();

  const doc = root instanceof Document ? root : root.ownerDocument ?? document;

  const showForBar = (bar: HTMLElement): void => {
    const payload = readProgressionTooltipPayload(bar);
    if (!payload) return;

    const rect = bar.getBoundingClientRect();
    uiEvents.emit(UIEventType.SHOW_TOOLTIP, {
      data: { kind: 'progression', data: payload },
      x: rect.left + rect.width / 2,
      y: rect.top,
      placement: 'above',
    });
  };

  const onMouseOver = (event: MouseEvent): void => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const bar = target.closest<HTMLElement>('[data-progression-tooltip]');
    if (!bar) return;
    if (bar === activeBar) return;

    activeBar = bar;
    showForBar(bar);
  };

  const onMouseOut = (event: MouseEvent): void => {
    if (!activeBar) return;

    const related = event.relatedTarget;
    if (related instanceof Node && activeBar.contains(related)) return;

    const nextBar = related instanceof Element
      ? related.closest<HTMLElement>('[data-progression-tooltip]')
      : null;

    if (nextBar === activeBar) return;

    activeBar = null;
    uiEvents.emit(UIEventType.HIDE_TOOLTIP, {});
  };

  doc.addEventListener('mouseover', onMouseOver, true);
  doc.addEventListener('mouseout', onMouseOut, true);

  teardown = () => {
    doc.removeEventListener('mouseover', onMouseOver, true);
    doc.removeEventListener('mouseout', onMouseOut, true);
    activeBar = null;
    teardown = null;
  };

  return teardownProgressionTooltipDelegation;
}

export function teardownProgressionTooltipDelegation(): void {
  teardown?.();
  activeBar = null;
}
