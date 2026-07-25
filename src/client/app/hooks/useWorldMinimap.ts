import { useEffect, type RefObject } from 'react';
import { getGameStateManager } from '../../../shared/state/GameStateManager.js';
import { getDataStore } from '../../economy/economyLayer.js';
import { buildMinimapTerrain } from '../../world/minimap/buildMinimapTerrain.js';
import { loadMinimapOverview } from '../../world/minimap/loadMinimapOverview.js';
import { minimapClientClickToWorldTarget } from '../../world/minimap/minimapClickCoords.js';
import { dispatchMinimapNavigate } from '../../world/minimap/minimapNavigation.js';
import { MinimapRenderer } from '../../world/minimap/MinimapRenderer.js';
import type { MinimapSnapshot } from '../../world/minimap/minimapTypes.js';
import {
  getMinimapSnapshot,
  subscribeMinimapSnapshot,
} from '../../world/minimap/minimapState.js';
import type { MapId } from '../../../shared/world/mapRegistry.js';

export function useWorldMinimap(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  enabled = true,
): void {
  useEffect(() => {
    if (!enabled) return undefined;

    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const renderer = new MinimapRenderer(canvas);
    let activeMapId: MapId | null = null;
    let lastSnapshot: MinimapSnapshot | null = null;
    let overviewLoadToken = 0;

    const redrawLastSnapshot = (): void => {
      if (!lastSnapshot) return;
      renderer.render(lastSnapshot);
    };

    const onSnapshot = (snapshot: MinimapSnapshot): void => {
      lastSnapshot = snapshot;

      if (activeMapId !== snapshot.mapId) {
        activeMapId = snapshot.mapId;
        const terrain = buildMinimapTerrain(snapshot.mapId);
        renderer.setTerrain(terrain, null);
        renderer.render(snapshot);

        const token = ++overviewLoadToken;
        void loadMinimapOverview(snapshot.mapId).then((overview) => {
          if (token !== overviewLoadToken || activeMapId !== snapshot.mapId) return;
          renderer.setTerrain(terrain, overview);
          if (lastSnapshot) renderer.render(lastSnapshot);
        });
        return;
      }

      renderer.render(snapshot);
    };

    const onMinimapClick = (event: MouseEvent): void => {
      if (!getGameStateManager().acceptsMovementInput()) return;
      event.preventDefault();
      event.stopPropagation();

      const snapshot = lastSnapshot ?? getMinimapSnapshot();
      if (!snapshot) return;

      const target = minimapClientClickToWorldTarget(
        event.clientX,
        event.clientY,
        canvas,
        snapshot.tilesWide,
        snapshot.tilesHigh,
      );
      if (!target) return;

      dispatchMinimapNavigate(target);
    };

    canvas.addEventListener('click', onMinimapClick);

    const dataStore = getDataStore();
    const unsubscribers = [
      subscribeMinimapSnapshot(onSnapshot),
      dataStore.subscribe('marcosState', redrawLastSnapshot),
      dataStore.subscribe('wallet', redrawLastSnapshot),
    ];

    const existing = getMinimapSnapshot();
    if (existing) {
      onSnapshot(existing);
    }

    return () => {
      overviewLoadToken += 1;
      for (const off of unsubscribers) off();
      canvas.removeEventListener('click', onMinimapClick);
    };
  }, [canvasRef, enabled]);
}
