import type { HubPanelController } from './components/HubPanelController.js';

import type { UIComponent } from './UIComponent.js';

import { isMarketTerminalAccessGranted } from '../../shared/economy/marketAccessGate.js';

import { uiEvents, UIEventType, type UiWindowId } from './uiEvents.js';

import {
  tryCloseReactWorldPanel,
  tryCloseTopmostReactWorldPanel,
  tryOpenReactWorldPanel,
  tryToggleReactWorldPanel,
} from '../app/panels/initWorldPanelsBridge.js';
import { isReactGamePanelsEnabled } from '../app/bridge/panelsBridge.js';



export type WindowManagerDeps = {

  readonly panels: ReadonlyMap<UiWindowId, UIComponent>;

  readonly hub: HubPanelController;

};



/**

 * Ponto único para abrir, fechar e alternar janelas HUD.

 * Várias HUDs móveis podem ficar abertas ao mesmo tempo; o Hub permanece aberto até fechar via HUB/×.

 * Painéis móveis empilham acima do Hub (z-index) e só fecham via × ou ESC (última em foco).

 */

export class WindowManager {

  private static active: WindowManager | null = null;



  private readonly panels: ReadonlyMap<UiWindowId, UIComponent>;

  private readonly hub: HubPanelController;



  constructor(deps: WindowManagerDeps) {

    this.panels = deps.panels;

    this.hub = deps.hub;

  }



  static register(instance: WindowManager): void {

    WindowManager.active = instance;

  }



  static unregister(instance: WindowManager): void {

    if (WindowManager.active === instance) {

      WindowManager.active = null;

    }

  }



  static getActive(): WindowManager | null {

    return WindowManager.active;

  }



  openWindow(windowId: UiWindowId): void {

    if (windowId === 'market' && !isMarketTerminalAccessGranted()) {

      return;

    }

    if (tryOpenReactWorldPanel(windowId)) {

      return;

    }



    if (windowId === 'hub') {

      this.hub.open();

      return;

    }



    if (windowId === 'dialogue') {

      this.panels.get('dialogue')?.open();

      return;

    }



    const panel = this.panels.get(windowId);

    if (!panel) return;



    if (panel.isOpen()) {

      panel.focus();

      return;

    }



    panel.open();

  }



  closeWindow(windowId: UiWindowId): void {

    if (tryCloseReactWorldPanel(windowId)) {

      return;

    }

    if (windowId === 'hub') {

      this.hub.close();

      return;

    }

    this.panels.get(windowId)?.close();

  }



  toggleWindow(windowId: UiWindowId): void {

    if (tryToggleReactWorldPanel(windowId)) {

      return;

    }

    if (windowId === 'hub') {

      if (this.hub.isOpen()) {

        this.hub.close();

      } else {

        this.hub.open();

      }

      return;

    }



    const panel = this.panels.get(windowId);

    if (!panel) return;

    if (panel.isOpen()) {

      this.closeWindow(windowId);

      return;

    }

    if (windowId === 'market' && !isMarketTerminalAccessGranted()) {

      return;

    }

    this.openWindow(windowId);

  }



  closeTopmostOpenMovableWindow(): boolean {

    if (tryCloseTopmostReactWorldPanel()) {

      return true;

    }

    if (isReactGamePanelsEnabled()) {

      return false;

    }



    let topPanel: UIComponent | null = null;

    let topZ = -Infinity;



    for (const panel of this.panels.values()) {

      if (!panel.isOpen() || !panel.isMovablePanel()) continue;

      const root = panel.getRootElement();

      if (!root) continue;

      const zRaw = getComputedStyle(root).zIndex;

      const z = zRaw === 'auto' ? 0 : Number.parseInt(zRaw, 10) || 0;

      if (z >= topZ) {

        topZ = z;

        topPanel = panel;

      }

    }



    if (!topPanel) return false;

    topPanel.close();

    return true;

  }

  getPanel(windowId: UiWindowId): UIComponent | undefined {
    return this.panels.get(windowId);
  }

}



export function getWindowManager(): WindowManager | null {

  return WindowManager.getActive();

}



/** API estável para painéis, Hub e atalhos — usa instância ativa ou uiEvents. */

export const windowManager = {

  open(windowId: UiWindowId): void {

    const manager = getWindowManager();

    if (manager) {

      manager.openWindow(windowId);

      return;

    }

    uiEvents.emit(UIEventType.OPEN_WINDOW, { windowId });

  },



  close(windowId: UiWindowId): void {

    const manager = getWindowManager();

    if (manager) {

      manager.closeWindow(windowId);

      return;

    }

    uiEvents.emit(UIEventType.CLOSE_WINDOW, { windowId });

  },



  toggle(windowId: UiWindowId): void {

    const manager = getWindowManager();

    if (manager) {

      manager.toggleWindow(windowId);

      return;

    }

    uiEvents.emit(UIEventType.TOGGLE_WINDOW, { windowId });

  },

};


