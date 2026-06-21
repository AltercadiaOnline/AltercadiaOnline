import type { BaseUIComponent } from '../../ui/UIComponent.js';
import type { UiWindowId } from '../../ui/uiEvents.js';
import {
  closeReactMovablePanel,
  focusReactMovablePanel,
  isReactMovablePanelEnabled,
  openReactMovablePanel,
} from './reactMovablePanelBridge.js';

/** Bypass padrão — monta só no host React; abre/fecha via store. */
export function bindReactWorldPanelLegacyBypass(
  panel: BaseUIComponent,
  windowId: UiWindowId,
): void {
  const mountImpl = panel.mount.bind(panel);
  const openImpl = panel.open.bind(panel);
  const closeImpl = panel.close.bind(panel);
  const focusImpl = panel.focus.bind(panel);

  panel.mount = (parent: HTMLElement): void => {
    if (isReactMovablePanelEnabled() && parent.id === 'ui-layer') return;
    mountImpl(parent);
  };

  panel.open = (): void => {
    if (openReactMovablePanel(panel, windowId)) return;
    openImpl();
  };

  panel.close = (): void => {
    if (closeReactMovablePanel(panel, windowId)) return;
    closeImpl();
  };

  panel.focus = (): void => {
    if (focusReactMovablePanel(panel, windowId)) return;
    focusImpl();
  };
}
