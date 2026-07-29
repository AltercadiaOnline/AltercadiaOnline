import { useSyncExternalStore } from 'react';
import { useWorldPanelsStore } from '../../../store/worldPanelsStore.js';
import { windowManager } from '../../../panels/worldWindowController.js';
import { subscribeExternalStore } from '../../../hooks/subscribeExternalStore.js';
import { WorldGameClockWidget } from './WorldGameClockWidget.js';
import { WorldNetLagWidget } from './WorldNetLagWidget.js';

/**
 * Canto superior-direito do mapa — relógio + HUB (screen-space, sem scale do stage).
 */
export function WorldHubSocialCluster() {
  const hubOpen = useSyncExternalStore(
    (onChange) =>
      subscribeExternalStore(
        (listener) => useWorldPanelsStore.subscribe(() => listener()),
        onChange,
      ),
    () => useWorldPanelsStore.getState().hubOpen,
    () => false,
  );

  return (
    <div
      id="ui-hub-social-cluster"
      className="ui-hub-social-cluster"
      data-ui-widget="world-hub-cluster"
      aria-label="Hub Social e relógio do mundo"
      style={{
        position: 'absolute',
        top: 12,
        right: 12,
        zIndex: 40,
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'stretch',
        gap: 8,
        pointerEvents: 'none',
      }}
    >
      <WorldNetLagWidget />
      <WorldGameClockWidget />
      <button
        type="button"
        id="ui-hub-launcher"
        className="ui-hub-launcher ui-skin-hybrid"
        style={{ pointerEvents: 'auto' }}
        aria-expanded={hubOpen}
        aria-controls="world-hub-panel"
        aria-label={hubOpen ? 'Fechar Hub Central' : 'Abrir Hub Central'}
        onClick={() => windowManager.toggle('hub')}
      >
        HUB
      </button>
    </div>
  );
}
