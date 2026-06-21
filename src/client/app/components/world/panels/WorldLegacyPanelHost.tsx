import { useEffect, useRef } from 'react';
import type { BaseUIComponent } from '../../../../ui/UIComponent.js';
import { getWindowManager } from '../../../../ui/WindowManager.js';
import type { WorldPanelRenderProps } from '../../../panels/worldPanelRenderers.js';
import { tryCloseReactWorldPanel, tryFocusReactWorldPanel } from '../../../panels/initWorldPanelsBridge.js';

/**
 * Monta painel legado (UIComponent) dentro da camada React — reutiliza templates e lógica existentes.
 */
export function WorldLegacyPanelHost({ entry, focused }: WorldPanelRenderProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<BaseUIComponent | null>(null);
  const { windowId, zIndex } = entry;

  useEffect(() => {
    const panel = getWindowManager()?.getPanel(windowId) as BaseUIComponent | undefined;
    const host = hostRef.current;
    if (!panel || !host) return undefined;

    panelRef.current = panel;
    panel.mount(host);
    panel.openInHost();

    return () => {
      panel.closeInHost();
    };
  }, [windowId]);

  useEffect(() => {
    if (focused) {
      tryFocusReactWorldPanel(windowId);
      panelRef.current?.focus();
    }
  }, [focused, windowId]);

  useEffect(() => {
    const root = hostRef.current?.querySelector<HTMLElement>(`[data-ui-panel="${windowId}"]`);
    if (!root) return;
    root.style.zIndex = String(zIndex);
    if (focused) {
      panelRef.current?.focus();
    }
  }, [zIndex, focused, windowId]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;

    const onCloseClick = (event: MouseEvent): void => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (!target.closest('[data-action="close"], .ui-panel__close')) return;
      if (!host.contains(target)) return;
      tryCloseReactWorldPanel(windowId);
    };

    host.addEventListener('click', onCloseClick);
    return () => host.removeEventListener('click', onCloseClick);
  }, [windowId]);

  return (
    <div
      ref={hostRef}
      className="world-legacy-panel-host pointer-events-none absolute inset-0"
      data-world-legacy-panel={windowId}
    />
  );
}
