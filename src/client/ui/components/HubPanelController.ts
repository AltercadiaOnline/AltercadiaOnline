import { getPanelsBridge } from '../../app/bridge/panelsBridge.js';
import { isReactGamePanelsEnabled } from '../../app/bridge/panelsBridge.js';
import { BaseUIComponent } from '../UIComponent.js';

/**
 * Estado do Hub para o WindowManager — renderização exclusiva via `WorldHubPanel` (React).
 */
export class HubPanelController extends BaseUIComponent {
  constructor() {
    super({
      id: 'hub',
      rootClassName: 'ui-panel ui-panel--hub ui-panel--hub-bar',
      movable: false,
    });
  }

  override mount(_parent: HTMLElement): void {
    // Sem DOM legado — WorldPanelsLayer renderiza o hub.
  }

  override open(): void {
    if (this.openState) return;
    this.openState = true;
    if (isReactGamePanelsEnabled()) {
      getPanelsBridge().setHubOpen(true);
    }
    this.onOpen();
  }

  override close(): void {
    if (!this.openState) return;
    this.openState = false;
    if (isReactGamePanelsEnabled()) {
      getPanelsBridge().setHubOpen(false);
    }
    this.onClose();
  }

  override isOpen(): boolean {
    return this.openState;
  }

  override getRootElement(): HTMLElement | null {
    return null;
  }

  createTemplate(): string {
    return '';
  }
}
