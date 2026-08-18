import { useSyncExternalStore } from 'react';
import { useWorldPanelsStore } from '../../../store/worldPanelsStore.js';
import { windowManager } from '../../../panels/worldWindowController.js';
import { subscribeExternalStore } from '../../../hooks/subscribeExternalStore.js';
import { WorldGameClockWidget } from './WorldGameClockWidget.js';
import { WorldNetLagWidget } from './WorldNetLagWidget.js';
import {
  getMirroredStaticNetwork,
  subscribeStaticNetworkMirror,
} from '../../../../world/staticNetworkSyncBridge.js';
import { hasStaticHeatAlert } from '../hub/staticNetworkView.js';

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

  const staticHot = useSyncExternalStore(
    subscribeStaticNetworkMirror,
    () => hasStaticHeatAlert(getMirroredStaticNetwork()),
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
        top: 'var(--ui-hub-anchor-top, 12px)',
        right: 'var(--ui-hub-anchor-right, 28px)',
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
        className={`ui-hub-launcher ui-skin-hybrid${staticHot ? ' ui-hub-launcher--static-hot' : ''}`}
        style={{ pointerEvents: 'auto' }}
        aria-expanded={hubOpen}
        aria-controls="world-hub-panel"
        aria-label={hubOpen ? 'Fechar Hub Central' : 'Abrir Hub Central'}
        onClick={() => windowManager.toggle('hub')}
      >
        HUB
        {staticHot ? <span className="ui-hub-launcher__static-dot" aria-hidden="true" /> : null}
      </button>
    </div>
  );
}
