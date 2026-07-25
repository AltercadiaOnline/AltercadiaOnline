// @ts-nocheck
import { getPanelsBridge } from '../../app/bridge/panelsBridge.js';
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
    mount(_parent) {
        // Sem DOM legado — WorldPanelsLayer renderiza o hub.
    }
    open() {
        if (this.openState)
            return;
        this.openState = true;
        getPanelsBridge().setHubOpen(true);
        this.onOpen();
    }
    close() {
        if (!this.openState)
            return;
        this.openState = false;
        getPanelsBridge().setHubOpen(false);
        this.onClose();
    }
    isOpen() {
        return this.openState;
    }
    getRootElement() {
        return null;
    }
    createTemplate() {
        return '';
    }
}
