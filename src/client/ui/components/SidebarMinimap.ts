// @ts-nocheck
import { getDataStore } from '../../economy/economyLayer.js';
import { buildMinimapTerrain } from '../../world/minimap/buildMinimapTerrain.js';
import { minimapClientClickToWorldTarget } from '../../world/minimap/minimapClickCoords.js';
import { dispatchMinimapNavigate } from '../../world/minimap/minimapNavigation.js';
import { MinimapRenderer } from '../../world/minimap/MinimapRenderer.js';
import { getMinimapSnapshot, subscribeMinimapSnapshot, } from '../../world/minimap/minimapState.js';
/**

 * HUD do minimapa na barra lateral — espelha posições publicadas pela cena

 * e aceita click-to-move (pathfinding no mundo).

 */
export class SidebarMinimap {
    host;
    canvas;
    renderer;
    unsubscribers = [];
    onMinimapClick;
    activeMapId = null;
    lastSnapshot = null;
    constructor(host, canvas) {
        this.host = host;
        this.canvas = canvas;
        this.renderer = new MinimapRenderer(canvas);
        this.onMinimapClick = (event) => this.handleMinimapClick(event);
    }
    static mount(host) {
        host.innerHTML = `

      <canvas

        class="sidebar-minimap__canvas"

        aria-label="Minimapa do mundo — clique para mover"

        role="img"

      ></canvas>

    `;
        const canvas = host.querySelector('canvas');
        if (!(canvas instanceof HTMLCanvasElement)) {
            throw new Error('[SidebarMinimap] Canvas não encontrado após mount.');
        }
        return new SidebarMinimap(host, canvas);
    }
    attach() {
        const dataStore = getDataStore();
        this.canvas.addEventListener('click', this.onMinimapClick);
        this.unsubscribers.push(subscribeMinimapSnapshot((snapshot) => {
            this.onSnapshot(snapshot);
        }));
        this.unsubscribers.push(dataStore.subscribe('marcosState', () => {
            this.redrawLastSnapshot();
        }));
        this.unsubscribers.push(dataStore.subscribe('wallet', () => {
            this.redrawLastSnapshot();
        }));
        const existing = getMinimapSnapshot();
        if (existing) {
            this.onSnapshot(existing);
        }
    }
    detach() {
        for (const off of this.unsubscribers) {
            off();
        }
        this.unsubscribers.length = 0;
        this.canvas.removeEventListener('click', this.onMinimapClick);
        this.host.replaceChildren();
        this.activeMapId = null;
        this.lastSnapshot = null;
    }
    handleMinimapClick(event) {
        event.preventDefault();
        event.stopPropagation();
        const snapshot = this.lastSnapshot ?? getMinimapSnapshot();
        if (!snapshot)
            return;
        const target = minimapClientClickToWorldTarget(event.clientX, event.clientY, this.canvas, snapshot.tilesWide, snapshot.tilesHigh);
        if (!target)
            return;
        dispatchMinimapNavigate(target);
    }
    onSnapshot(snapshot) {
        this.lastSnapshot = snapshot;
        if (this.activeMapId !== snapshot.mapId) {
            this.activeMapId = snapshot.mapId;
            this.renderer.setTerrain(buildMinimapTerrain(snapshot.mapId));
        }
        this.renderer.render(snapshot);
    }
    redrawLastSnapshot() {
        if (!this.lastSnapshot)
            return;
        this.renderer.render(this.lastSnapshot);
    }
}
let activeMinimap = null;
export function getSidebarMinimap() {
    return activeMinimap;
}
export function destroySidebarMinimap() {
    activeMinimap?.detach();
    activeMinimap = null;
}
