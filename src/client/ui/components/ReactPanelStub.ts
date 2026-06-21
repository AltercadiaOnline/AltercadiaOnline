import { BaseUIComponent } from '../UIComponent.js';
import type { UiWindowId } from '../uiEvents.js';

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

export const REACT_NATIVE_WORLD_PANEL_IDS: readonly UiWindowId[] = [
  'market',
  'characters',
  'bank',
  'petLove',
  'moveset',
  'marcos',
];

export function createReactNativeWorldPanelStub(windowId: UiWindowId): ReactPanelStub {
  return new ReactPanelStub(windowId);
}
