import { BaseUIComponent } from '../UIComponent.js';
import type { UiWindowId } from '../uiEvents.js';
import { REACT_WORLD_PANEL_IDS } from '../../app/panels/worldPanelRegistry.js';

/**
 * Placeholder no WindowManager para painéis renderizados exclusivamente pela camada React.
 * open/close/focus são redirecionados por `bindReactWorldPanelLegacyBypass`.
 */
export class ReactPanelStub extends BaseUIComponent {
  constructor(windowId: UiWindowId) {
    super({
      id: windowId,
      rootClassName: 'ui-panel ui-panel--react-stub',
      movable: false,
    });
  }

  createTemplate(): string {
    return '';
  }
}

/** Painéis de exploração com renderer React (inclui hub via HubPanelController). */
export const REACT_NATIVE_WORLD_PANEL_IDS = REACT_WORLD_PANEL_IDS.filter(
  (windowId): windowId is Exclude<typeof windowId, 'hub'> => windowId !== 'hub',
);

export function createReactNativeWorldPanelStub(windowId: UiWindowId): ReactPanelStub {
  return new ReactPanelStub(windowId);
}
