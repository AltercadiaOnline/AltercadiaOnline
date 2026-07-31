import { useEffect, type RefObject } from 'react';
import { getGameStateManager } from '../../../shared/state/GameStateManager.js';
import { CRT_RADAR_THROTTLE_MS } from '../../world/minimap/crtRadarConfig.js';
import { radarClientClickToWorldTarget } from '../../world/minimap/minimapClickCoords.js';
import { dispatchMinimapNavigate } from '../../world/minimap/minimapNavigation.js';
import { MinimapRenderer } from '../../world/minimap/MinimapRenderer.js';
import type { MinimapSnapshot } from '../../world/minimap/minimapTypes.js';
import {
  getMinimapSnapshot,
  subscribeMinimapSnapshot,
} from '../../world/minimap/minimapState.js';

/**
 * Radar CRT na sidebar — redesenho throttled (150–200ms), sem texturas de terreno.
 */
export function useWorldMinimap(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  enabled = true,
): void {
  useEffect(() => {
    if (!enabled) return undefined;

    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const renderer = new MinimapRenderer(canvas);
    let lastSnapshot: MinimapSnapshot | null = null;
    let pendingSnapshot: MinimapSnapshot | null = null;
    let throttleTimer: ReturnType<typeof setTimeout> | null = null;
    let lastPaintMs = 0;

    const paint = (snapshot: MinimapSnapshot): void => {
      lastSnapshot = snapshot;
      lastPaintMs = performance.now();
      renderer.render(snapshot);
    };

    const schedulePaint = (snapshot: MinimapSnapshot): void => {
      pendingSnapshot = snapshot;
      const elapsed = performance.now() - lastPaintMs;
      if (elapsed >= CRT_RADAR_THROTTLE_MS) {
        if (throttleTimer !== null) {
          clearTimeout(throttleTimer);
          throttleTimer = null;
        }
        paint(snapshot);
        pendingSnapshot = null;
        return;
      }

      if (throttleTimer !== null) return;
      throttleTimer = setTimeout(() => {
        throttleTimer = null;
        if (pendingSnapshot) {
          paint(pendingSnapshot);
          pendingSnapshot = null;
        }
      }, Math.max(0, CRT_RADAR_THROTTLE_MS - elapsed));
    };

    const onMinimapClick = (event: MouseEvent): void => {
      if (!getGameStateManager().acceptsMovementInput()) return;
      event.preventDefault();
      event.stopPropagation();

      const snapshot = lastSnapshot ?? getMinimapSnapshot();
      if (!snapshot) return;

      const target = radarClientClickToWorldTarget(
        event.clientX,
        event.clientY,
        canvas,
        snapshot.playerTileX,
        snapshot.playerTileY,
        snapshot.tilesWide,
        snapshot.tilesHigh,
      );
      if (!target) return;

      dispatchMinimapNavigate(target);
    };

    canvas.addEventListener('click', onMinimapClick);
    const unsub = subscribeMinimapSnapshot(schedulePaint);

    const existing = getMinimapSnapshot();
    if (existing) {
      paint(existing);
    }

    return () => {
      unsub();
      if (throttleTimer !== null) clearTimeout(throttleTimer);
      canvas.removeEventListener('click', onMinimapClick);
    };
  }, [canvasRef, enabled]);
}
