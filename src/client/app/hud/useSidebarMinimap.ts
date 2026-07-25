// @ts-nocheck
import { useEffect } from 'react';
import { getDataStore } from '../../economy/economyLayer.js';
import { buildMinimapTerrain } from '../../world/minimap/buildMinimapTerrain.js';
import { minimapClientClickToWorldTarget } from '../../world/minimap/minimapClickCoords.js';
import { dispatchMinimapNavigate } from '../../world/minimap/minimapNavigation.js';
import { MinimapRenderer } from '../../world/minimap/MinimapRenderer.js';
import { getMinimapSnapshot, subscribeMinimapSnapshot, } from '../../world/minimap/minimapState.js';
export function useSidebarMinimap(canvasRef) {
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas)
            return;
        const renderer = new MinimapRenderer(canvas);
        let activeMapId = null;
        let lastSnapshot = null;
        const redrawLastSnapshot = () => {
            if (!lastSnapshot)
                return;
            renderer.render(lastSnapshot);
        };
        const onSnapshot = (snapshot) => {
            lastSnapshot = snapshot;
            if (activeMapId !== snapshot.mapId) {
                activeMapId = snapshot.mapId;
                renderer.setTerrain(buildMinimapTerrain(snapshot.mapId));
            }
            renderer.render(snapshot);
        };
        const onMinimapClick = (event) => {
            event.preventDefault();
            event.stopPropagation();
            const snapshot = lastSnapshot ?? getMinimapSnapshot();
            if (!snapshot)
                return;
            const target = minimapClientClickToWorldTarget(event.clientX, event.clientY, canvas, snapshot.tilesWide, snapshot.tilesHigh);
            if (!target)
                return;
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
            for (const off of unsubscribers) {
                off();
            }
            canvas.removeEventListener('click', onMinimapClick);
        };
    }, [canvasRef]);
}
