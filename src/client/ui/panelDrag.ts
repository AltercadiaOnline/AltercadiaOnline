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

/**
 * Posiciona via camada GPU (`translate3d`) — evita reflow de `left`/`top` a cada frame.
 * Âncora em (0,0) da camada; o deslocamento fica só no transform.
 */
function applyPanelPoint(panel: HTMLElement, point: { left: number; top: number }): void {
  const x = Math.round(point.left);
  const y = Math.round(point.top);
  panel.style.position = 'absolute';
  panel.style.left = '0';
  panel.style.top = '0';
  panel.style.right = 'auto';
  panel.style.bottom = 'auto';
  panel.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  panel.dataset.panelX = String(x);
  panel.dataset.panelY = String(y);
}

function measurePanel(panel: HTMLElement): { width: number; height: number } {
  const width = panel.offsetWidth || panel.getBoundingClientRect().width;
  const height = panel.offsetHeight || panel.getBoundingClientRect().height;
  return { width, height };
}

/**
 * Arraste pelo header da janela HUD.
 * - pointermove → só agenda rAF (1 apply/frame)
 * - posição = translate3d (compositor), não left/top
 * - medidas da camada/painel cacheadas no pointerdown
 */
export function attachDraggablePanel(
  panel: HTMLElement,
  layer: HTMLElement,
  options: DraggablePanelOptions,
): DraggablePanelController {
  const handleSelector = options.handleSelector ?? '.ui-panel__header';
  panel.classList.add('ui-panel--movable');
  panel.style.position = 'absolute';
  panel.style.left = '0';
  panel.style.top = '0';

  let dragging = false;
  let dragOffsetX = 0;
  let dragOffsetY = 0;
  let activePointerId: number | null = null;

  let layerLeft = 0;
  let layerTop = 0;
  let layerWidth = 0;
  let layerHeight = 0;
  let panelWidth = 0;
  let panelHeight = 0;

  let pendingClientX = 0;
  let pendingClientY = 0;
  let hasPendingMove = false;
  let rafId = 0;

  const cancelPendingFrame = (): void => {
    if (rafId !== 0) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }
    hasPendingMove = false;
  };

  const flushPendingMove = (): void => {
    rafId = 0;
    if (!dragging || !hasPendingMove) return;
    hasPendingMove = false;

    const next = clampPanelPosition(
      pendingClientX - dragOffsetX - layerLeft,
      pendingClientY - dragOffsetY - layerTop,
      panelWidth,
      panelHeight,
      layerWidth,
      layerHeight,
    );
    applyPanelPoint(panel, next);
    panel.dataset.positioned = 'true';
  };

  const onPointerMove = (event: PointerEvent): void => {
    if (!dragging || activePointerId !== event.pointerId) return;
    pendingClientX = event.clientX;
    pendingClientY = event.clientY;
    hasPendingMove = true;
    if (rafId === 0) {
      rafId = requestAnimationFrame(flushPendingMove);
    }
  };

  const stopDragging = (event?: PointerEvent): void => {
    if (!dragging) return;
    if (event && activePointerId !== null && event.pointerId !== activePointerId) return;

    // Flush do último ponteiro sem esperar o próximo frame.
    if (rafId !== 0) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }
    if (hasPendingMove) {
      flushPendingMove();
    }

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

    const layerRect = layer.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();
    const size = measurePanel(panel);

    layerLeft = layerRect.left;
    layerTop = layerRect.top;
    layerWidth = layer.clientWidth;
    layerHeight = layer.clientHeight;
    panelWidth = size.width;
    panelHeight = size.height;

    dragging = true;
    activePointerId = event.pointerId;
    dragOffsetX = event.clientX - panelRect.left;
    dragOffsetY = event.clientY - panelRect.top;
    panel.classList.add('ui-panel--dragging');
    panel.setPointerCapture(event.pointerId);

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerup', stopDragging);
    window.addEventListener('pointercancel', stopDragging);
    event.preventDefault();
    event.stopPropagation();
  };

  const ensureDefaultPosition = (): void => {
    if (panel.dataset.positioned === 'true') return;

    const nextLayerWidth = layer.clientWidth;
    const nextLayerHeight = layer.clientHeight;
    if (nextLayerWidth <= 0 || nextLayerHeight <= 0) {
      requestAnimationFrame(ensureDefaultPosition);
      return;
    }

    const { width, height } = measurePanel(panel);
    const point = resolvePanelDefaultPosition(
      options.panelId,
      width,
      height,
      nextLayerWidth,
      nextLayerHeight,
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
      cancelPendingFrame();
      panel.removeEventListener('pointerdown', onPointerDown);
      panel.removeEventListener('pointerdown', onPanelPointerDown);
    },
  };
}

export { resetMobileHudPanelZIndex as resetPanelZIndexCounter } from './panelZIndex.js';
