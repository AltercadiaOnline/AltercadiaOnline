import { buildTooltipRenderModel } from '../tooltip/tooltipContent.js';
import type { TooltipData } from '../tooltip/tooltipTypes.js';
import {
  resolveTooltipPosition,
  type TooltipPlacement,
} from '../tooltip/tooltipPlacement.js';
import { uiEvents, UIEventType } from '../uiEvents.js';
import {
  initProgressionTooltipDelegation,
  teardownProgressionTooltipDelegation,
} from '../tooltip/initProgressionTooltip.js';
const SHOW_DELAY_MS = 200;
const CURSOR_OFFSET = 14;
const VIEWPORT_PADDING = 8;

/**
 * Tooltip global reutilizável — escuta SHOW_TOOLTIP / HIDE_TOOLTIP via uiEvents.
 * Montado uma vez no DOM (singleton via `getTooltip()`).
 */
export class Tooltip {
  private root: HTMLElement | null = null;
  private showTimer: ReturnType<typeof setTimeout> | null = null;
  private visible = false;
  private mounted = false;
  private anchorX = 0;
  private anchorY = 0;
  private placement: TooltipPlacement = 'auto';
  private unsubscribers: Array<() => void> = [];  private readonly onDocumentMouseMove = (event: MouseEvent): void => {
    if (!this.visible) return;
    this.position(event.clientX, event.clientY);
  };

  mount(parent: ParentNode = document.body): void {
    if (this.mounted) return;
    this.mounted = true;

    this.root = document.createElement('aside');
    this.root.className = 'game-tooltip';
    this.root.setAttribute('hidden', '');
    this.root.setAttribute('role', 'tooltip');
    this.root.setAttribute('aria-live', 'polite');
    parent.appendChild(this.root);

    this.unsubscribers.push(
      uiEvents.on(UIEventType.SHOW_TOOLTIP, (payload) => {
        this.show(payload.data, payload.x, payload.y, payload.placement);
      }),      uiEvents.on(UIEventType.HIDE_TOOLTIP, () => {
        this.hide();
      }),
    );
  }

  show(
    data: TooltipData,
    clientX: number,
    clientY: number,
    placement: TooltipPlacement = 'auto',
  ): void {
    if (!this.root) return;

    this.anchorX = clientX;
    this.anchorY = clientY;
    this.placement = placement;

    this.clearShowTimer();
    this.showTimer = setTimeout(() => {
      const model = buildTooltipRenderModel(data);
      if (!model || !this.root) return;

      this.render(model);
      this.position(this.anchorX, this.anchorY);
      this.visible = true;
      this.root.removeAttribute('hidden');
      this.root.classList.add('game-tooltip--visible');
      if (this.placement === 'auto') {
        document.addEventListener('mousemove', this.onDocumentMouseMove);
      } else {
        document.removeEventListener('mousemove', this.onDocumentMouseMove);
      }
    }, SHOW_DELAY_MS);
  }
  hide(): void {
    this.clearShowTimer();
    document.removeEventListener('mousemove', this.onDocumentMouseMove);
    this.visible = false;
    this.root?.classList.remove('game-tooltip--visible');
    this.root?.setAttribute('hidden', '');
  }

  destroy(): void {
    for (const off of this.unsubscribers) off();
    this.unsubscribers.length = 0;
    this.hide();
    this.root?.remove();
    this.root = null;
    this.mounted = false;
  }

  private clearShowTimer(): void {
    if (this.showTimer !== null) {
      clearTimeout(this.showTimer);
      this.showTimer = null;
    }
  }

  private render(model: ReturnType<typeof buildTooltipRenderModel>): void {
    if (!this.root || !model) return;

    this.root.style.borderColor = model.borderColor;

    const bodyLines = model.lines
      .map((line) => `<p class="game-tooltip__line">${escapeHtml(line)}</p>`)
      .join('');

    this.root.innerHTML = `
      <p class="game-tooltip__line game-tooltip__line--title">${escapeHtml(model.title)}</p>
      ${bodyLines}
    `;
  }

  private position(clientX: number, clientY: number): void {
    if (!this.root) return;

    this.root.style.visibility = 'hidden';
    this.root.style.left = '0px';
    this.root.style.top = '0px';

    const rect = this.root.getBoundingClientRect();
    const { left, top } = resolveTooltipPosition({
      clientX,
      clientY,
      tooltipW: rect.width,
      tooltipH: rect.height,
      placement: this.placement,
      cursorOffset: CURSOR_OFFSET,
      viewportPadding: VIEWPORT_PADDING,
      viewportW: window.innerWidth,
      viewportH: window.innerHeight,
    });

    this.root.style.left = `${left}px`;
    this.root.style.top = `${top}px`;
    this.root.style.visibility = '';
  }}

let activeTooltip: Tooltip | null = null;

export function getTooltip(): Tooltip {
  if (!activeTooltip) {
    activeTooltip = new Tooltip();
  }
  return activeTooltip;
}

export function initTooltip(parent: ParentNode = document.body): Tooltip {
  const tooltip = getTooltip();
  tooltip.mount(parent);
  initProgressionTooltipDelegation(document);
  return tooltip;
}

export function destroyTooltip(): void {
  teardownProgressionTooltipDelegation();
  activeTooltip?.destroy();
  activeTooltip = null;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
