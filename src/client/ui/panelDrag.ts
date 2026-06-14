import { clampPanelPosition, resolvePanelDefaultPosition } from './panelLayout.js';
import { nextMobileHudPanelZIndex } from './panelZIndex.js';

export type DraggablePanelOptions = {
  readonly panelId: string;
  readonly handleSelector?: string;
};

export type DraggablePanelController = {
  ensureDefaultPosition(): void;
  bringToFront(): void;
  dispose(): void;
};

function applyPanelPoint(panel: HTMLElement, point: { left: number; top: number }): void {
  panel.style.position = 'absolute';
  panel.style.left = `${point.left}px`;
  panel.style.top = `${point.top}px`;
  panel.style.right = 'auto';
  panel.style.bottom = 'auto';
  panel.style.transform = 'none';
}

function measurePanel(panel: HTMLElement): { width: number; height: number } {
  const width = panel.offsetWidth || panel.getBoundingClientRect().width;
  const height = panel.offsetHeight || panel.getBoundingClientRect().height;
  return { width, height };
}

/**
 * Arraste pelo header da janela HUD, com posição inicial e clamp na camada pai.
 */
export function attachDraggablePanel(
  panel: HTMLElement,
  layer: HTMLElement,
  options: DraggablePanelOptions,
): DraggablePanelController {
  const handleSelector = options.handleSelector ?? '.ui-panel__header';
  panel.classList.add('ui-panel--movable');
  panel.style.position = 'absolute';

  let dragging = false;
  let dragOffsetX = 0;
  let dragOffsetY = 0;
  let activePointerId: number | null = null;

  const onPointerMove = (event: PointerEvent): void => {
    if (!dragging || activePointerId !== event.pointerId) return;
    const layerRect = layer.getBoundingClientRect();
    const { width, height } = measurePanel(panel);
    const next = clampPanelPosition(
      event.clientX - dragOffsetX - layerRect.left,
      event.clientY - dragOffsetY - layerRect.top,
      width,
      height,
      layer.clientWidth,
      layer.clientHeight,
    );
    applyPanelPoint(panel, next);
    panel.dataset.positioned = 'true';
  };

  const stopDragging = (event?: PointerEvent): void => {
    if (!dragging) return;
    if (event && activePointerId !== null && event.pointerId !== activePointerId) return;

    dragging = false;
    panel.classList.remove('ui-panel--dragging');

    if (activePointerId !== null) {
      try {
        panel.releasePointerCapture(activePointerId);
      } catch {
        // pointer already released
      }
      activePointerId = null;
    }

    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', stopDragging);
    window.removeEventListener('pointercancel', stopDragging);
  };

  const onPointerDown = (event: PointerEvent): void => {
    if (event.button !== 0) return;

    const target = event.target;
    if (!(target instanceof Element)) return;

    const handle = target.closest(handleSelector);
    if (!handle || !panel.contains(handle)) return;
    if (target.closest('[data-panel-no-drag], [data-action="close"]')) return;
    if (target.closest('button, a, input, select, textarea, label')) return;

    bringToFront();

    const panelRect = panel.getBoundingClientRect();
    dragging = true;
    activePointerId = event.pointerId;
    dragOffsetX = event.clientX - panelRect.left;
    dragOffsetY = event.clientY - panelRect.top;
    panel.classList.add('ui-panel--dragging');
    panel.setPointerCapture(event.pointerId);

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', stopDragging);
    window.addEventListener('pointercancel', stopDragging);
    event.preventDefault();
    event.stopPropagation();
  };

  const ensureDefaultPosition = (): void => {
    if (panel.dataset.positioned === 'true') return;

    const layerWidth = layer.clientWidth;
    const layerHeight = layer.clientHeight;
    if (layerWidth <= 0 || layerHeight <= 0) {
      requestAnimationFrame(ensureDefaultPosition);
      return;
    }

    const { width, height } = measurePanel(panel);
    const point = resolvePanelDefaultPosition(
      options.panelId,
      width,
      height,
      layerWidth,
      layerHeight,
    );
    applyPanelPoint(panel, point);
    panel.dataset.positioned = 'true';
  };

  const bringToFront = (): void => {
    panel.style.zIndex = String(nextMobileHudPanelZIndex());
  };

  const onPanelPointerDown = (event: PointerEvent): void => {
    if (event.button !== 0) return;
    bringToFront();
  };

  panel.addEventListener('pointerdown', onPointerDown);
  panel.addEventListener('pointerdown', onPanelPointerDown);

  return {
    ensureDefaultPosition,
    bringToFront,
    dispose(): void {
      stopDragging();
      panel.removeEventListener('pointerdown', onPointerDown);
      panel.removeEventListener('pointerdown', onPanelPointerDown);
    },
  };
}

export { resetMobileHudPanelZIndex as resetPanelZIndexCounter } from './panelZIndex.js';
